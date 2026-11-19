"""OpenSearch and Neo4j materialized views of authorized PostgreSQL data."""

from contextlib import nullcontext
from functools import lru_cache
import json
import re
from urllib.parse import urlsplit
from uuid import UUID, uuid4

import httpx
from neo4j import GraphDatabase, READ_ACCESS
from neo4j.exceptions import DriverError, Neo4jError
from psycopg.rows import dict_row

from app.core.config import settings
from app.core.database import database
from app.schemas.analysis import KEVEntry
from app.services.analysis import JOB_COLUMNS, read_job
from app.services.evidence_vault import evidence_vault_service

ALIAS = "forentrace-case-search"
INDEX_PREFIX = "forentrace-search-"
LOOPBACK = {"localhost", "127.0.0.1", "::1"}


class ProjectionUnavailable(RuntimeError):
    pass


def search_client():
    endpoint = settings.FORENTRACE_OPENSEARCH_URL
    if endpoint is None:
        raise ProjectionUnavailable("OpenSearch is unconfigured.")
    url = urlsplit(endpoint)
    if url.scheme != "https" and not (url.scheme == "http" and url.hostname in LOOPBACK):
        raise ProjectionUnavailable("OpenSearch requires TLS outside loopback.")
    username, secret = settings.FORENTRACE_OPENSEARCH_USERNAME, settings.FORENTRACE_OPENSEARCH_PASSWORD
    if bool(username) != bool(secret):
        raise ProjectionUnavailable("Configure both OpenSearch credentials.")
    if url.hostname not in LOOPBACK and not username:
        raise ProjectionUnavailable("Remote OpenSearch requires credentials.")
    return httpx.Client(base_url=endpoint.rstrip("/"), timeout=15, trust_env=False,
                        auth=(username, secret.get_secret_value()) if username and secret else None)


@lru_cache
def graph_driver():
    endpoint = settings.FORENTRACE_NEO4J_URI
    secret = settings.FORENTRACE_NEO4J_PASSWORD
    if not endpoint or not secret:
        raise ProjectionUnavailable("Configure Neo4j and its credentials.")
    url = urlsplit(endpoint)
    if url.scheme not in {"bolt+s", "neo4j+s"} and not (
        url.scheme in {"bolt", "neo4j"} and url.hostname in LOOPBACK
    ):
        raise ProjectionUnavailable("Neo4j requires TLS outside loopback.")
    return GraphDatabase.driver(endpoint, auth=(settings.FORENTRACE_NEO4J_USERNAME, secret.get_secret_value()),
                                connection_timeout=5, connection_acquisition_timeout=10,
                                max_transaction_retry_time=10)


def list_kev(*, query: str | None = None, ids: list[str] | None = None, connection=None) -> list[KEVEntry]:
    sql = """SELECT e.*, c.version AS catalog_version, c.imported_at, c.source_mode, c.source_sha256
             FROM forentrace_kev_entries e CROSS JOIN forentrace_kev_catalog c"""
    params = []
    if query is not None:
        sql += """ WHERE to_tsvector('simple', cve_id || ' ' || vendor || ' ' || product || ' ' || title || ' ' || description)
                         @@ websearch_to_tsquery('simple', %s)"""
        params.append(query)
    elif ids is not None:
        sql += " WHERE cve_id = ANY(%s)"
        params.append(ids)
    sql += " ORDER BY date_added DESC, cve_id"
    if query is not None or ids is not None:
        sql += " LIMIT 50"
    with (database.connect() if connection is None else nullcontext(connection)) as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(sql, params)
            return [KEVEntry.model_validate(row) for row in cursor]


def snapshot(include_catalog: bool):
    with database.connect() as conn:
        conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        cases = [row[0] for row in conn.execute("SELECT id FROM forentrace_cases")]
        originals = evidence_vault_service.list_artifacts(cases, connection=conn)
        allowed = {(item.case_id, item.id): item.hashes.sha256 for item in originals}
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(f"SELECT {JOB_COLUMNS} FROM forentrace_analysis_jobs WHERE status = 'completed'")
            reports = [read_job(row) for row in cursor
                       if allowed.get((row["case_id"], row["evidence_id"])) == row["input_sha256"]]
        catalog = list_kev(connection=conn) if include_catalog else []
    return originals, reports, catalog


def search_ids(case_id: str, query: str, *, excluded_ids: list[str] | None = None) -> tuple[list[str], list[UUID], list[str]]:
    requests = []
    for kind in ("evidence", "report", "kev"):
        clauses = {
            "filter": [{"term": {"kind": kind}}, {"term": {"case_id": "" if kind == "kev" else case_id}}],
            "must": [{"match": {"text": {"query": query, "operator": "and"}}}],
        }
        if excluded_ids and kind != "kev":
            clauses["must_not"] = [{"terms": {"evidence_id": excluded_ids}}]
        requests.extend(({}, {
            "size": 50, "_source": False,
            "query": {"bool": clauses},
        }))
    body = "".join(json.dumps(item) + "\n" for item in requests)
    try:
        with search_client() as client:
            result = client.post(f"/{ALIAS}/_msearch", content=body,
                                 headers={"Content-Type": "application/x-ndjson"}).raise_for_status().json()
        responses = result["responses"]
        if len(responses) != 3 or any("error" in response or response.get("timed_out")
                                     or response.get("_shards", {}).get("failed", 0) for response in responses):
            raise ProjectionUnavailable("OpenSearch returned an incomplete search.")
        ids = []
        for kind, response in zip(("evidence", "report", "kev"), responses, strict=True):
            prefix = kind + ":"
            ids.append([hit["_id"][len(prefix):] for hit in response["hits"]["hits"]
                        if hit["_id"].startswith(prefix)])
        return ids[0], [UUID(value) for value in ids[1]], ids[2]
    except (httpx.HTTPError, ValueError, TypeError, KeyError, AttributeError) as error:
        raise ProjectionUnavailable("OpenSearch is unavailable or its index has not been built.") from error


def sync_search() -> None:
    # shortcut: rebuilds the projection in batches; use an outbox before sustained high-volume ingestion.
    originals, reports, catalog = snapshot(include_catalog=True)
    documents = [
        ("evidence", item.id, item.case_id, item.id, f"{item.id} {item.name} {item.type} {item.hashes.sha256}")
        for item in originals
    ] + [
        ("report", str(job.id), job.case_id, job.evidence_id,
         f"{job.analyzer} {getattr(job.result.report, 'classification', '')} {job.result.report_sha256} {job.input_sha256}")
        for job in reports
    ] + [
        ("kev", item.cve_id, "", None, f"{item.cve_id} {item.vendor} {item.product} {item.title} {item.description}")
        for item in catalog
    ]
    index = INDEX_PREFIX + uuid4().hex
    with search_client() as client:
        previous = client.get(f"/_alias/{ALIAS}")
        old = [] if previous.status_code == 404 else list(previous.raise_for_status().json())
        if any(not re.fullmatch(INDEX_PREFIX + r"[a-f0-9]{32}", name) for name in old):
            raise ProjectionUnavailable("The OpenSearch alias points outside the managed index namespace.")
        client.put(f"/{index}", json={
            "settings": {"number_of_shards": 1, "number_of_replicas": 0},
            "mappings": {"dynamic": "strict", "_source": {"enabled": False}, "properties": {
                "text": {"type": "text"}, "kind": {"type": "keyword"}, "case_id": {"type": "keyword"},
                "evidence_id": {"type": "keyword"},
            }},
        }).raise_for_status()
        try:
            for offset in range(0, len(documents), 250):
                lines = []
                for kind, object_id, case_id, evidence_id, text in documents[offset:offset + 250]:
                    lines.append(json.dumps({"index": {"_id": f"{kind}:{object_id}"}}))
                    lines.append(json.dumps({"kind": kind, "case_id": case_id, "evidence_id": evidence_id, "text": text}))
                result = client.post(f"/{index}/_bulk", content="\n".join(lines) + "\n",
                                     headers={"Content-Type": "application/x-ndjson"}).raise_for_status().json()
                if result.get("errors"):
                    raise ProjectionUnavailable("OpenSearch failed to index one or more records.")
            client.post(f"/{index}/_refresh").raise_for_status()
        except (httpx.HTTPError, ProjectionUnavailable, ValueError):
            try:
                client.delete(f"/{index}")
            except httpx.HTTPError:
                pass  # This staging index was never published.
            raise
        actions = [{"remove_index": {"index": name}} for name in old]
        actions.append({"add": {"index": index, "alias": ALIAS}})
        publication = client.post("/_aliases", json={"actions": actions}).raise_for_status().json()
        if publication.get("acknowledged") is not True:
            raise ProjectionUnavailable("OpenSearch did not confirm publication of the new index.")


def lineage_ids(case_id: str, evidence_id: str) -> list[UUID]:
    try:
        with graph_driver().session(default_access_mode=READ_ACCESS, database="neo4j") as session:
            result = session.run("""
                MATCH (state:ForenTraceLineageState {name:'case-lineage'})
                OPTIONAL MATCH (e:ForenTraceLineage {kind:'evidence', id:$evidence, case_id:$case})
                OPTIONAL MATCH (e)-[:FORENTRACE_DERIVED]->(r:ForenTraceLineage {kind:'report', case_id:$case})
                RETURN e.id AS projected_evidence, collect(r.id)[..100] AS ids
            """, case=case_id, evidence=evidence_id).single()
            if result is None:
                raise ProjectionUnavailable("Neo4j lineage has not been built.")
            if result["projected_evidence"] is None:
                raise ProjectionUnavailable("Neo4j has not indexed this evidence yet. Try again after the next refresh.")
            return [UUID(value) for value in result["ids"]]
    except (Neo4jError, DriverError, ValueError, TypeError) as error:
        raise ProjectionUnavailable("Neo4j lineage is unavailable.") from error


def sync_lineage() -> None:
    originals, reports, _ = snapshot(include_catalog=False)
    generation = uuid4().hex
    with graph_driver().session(database="neo4j") as session:
        session.run("""
            CREATE CONSTRAINT forentrace_lineage_id IF NOT EXISTS
            FOR (n:ForenTraceLineage) REQUIRE (n.kind, n.id) IS UNIQUE
        """).consume()
        with session.begin_transaction(timeout=60) as tx:
            tx.run("""
                UNWIND $rows AS row
                MERGE (n:ForenTraceLineage {kind:'evidence', id:row.id})
                SET n.case_id = row.case_id, n.generation = $generation
            """, rows=[{"id": item.id, "case_id": item.case_id} for item in originals],
                   generation=generation).consume()
            tx.run("""
                UNWIND $rows AS row
                MATCH (e:ForenTraceLineage {kind:'evidence', id:row.evidence_id, case_id:row.case_id})
                MERGE (r:ForenTraceLineage {kind:'report', id:row.id})
                SET r.case_id = row.case_id, r.generation = $generation
                MERGE (e)-[link:FORENTRACE_DERIVED]->(r)
                SET link.generation = $generation
            """, rows=[{"id": str(job.id), "case_id": job.case_id, "evidence_id": job.evidence_id} for job in reports],
                   generation=generation).consume()
            tx.run("""
                MATCH (:ForenTraceLineage)-[r:FORENTRACE_DERIVED]->(:ForenTraceLineage)
                WHERE r.generation <> $generation DELETE r
            """, generation=generation).consume()
            tx.run("""
                MATCH (n:ForenTraceLineage) WHERE n.generation <> $generation DETACH DELETE n
            """, generation=generation).consume()
            tx.run("""
                MERGE (state:ForenTraceLineageState {name:'case-lineage'})
                SET state.built_at = datetime()
            """).consume()
            tx.commit()
