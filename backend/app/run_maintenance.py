"""Run scheduled catalog imports and rebuild the configured read projections."""

import argparse
import logging
import time

from psycopg import OperationalError

from app.core.config import settings
from app.core.database import database
from app.ingest_kev import import_official
from app.ingest_intelligence import FeedRateLimited, import_official as import_intelligence
from app.services.projections import sync_search, sync_lineage

logger = logging.getLogger("forentrace.maintenance")


def run_due(conn, task: str, lock: int, minutes: int, action) -> bool:
    if not conn.execute("SELECT pg_try_advisory_lock(130518, %s)", (lock,)).fetchone()[0]:
        return True
    try:
        conn.execute("INSERT INTO forentrace_maintenance (task) VALUES (%s) ON CONFLICT DO NOTHING", (task,))
        due = conn.execute("""
            UPDATE forentrace_maintenance
            SET last_attempt = now(), next_due = now() + LEAST(%s, 5) * interval '1 minute'
            WHERE task = %s AND next_due <= now() RETURNING task
        """, (minutes, task)).fetchone()
        if not due:
            return True
        try:
            action()
        except Exception as error:
            # Store the failure class instead of credentials, URLs, or untrusted response bodies.
            conn.execute("UPDATE forentrace_maintenance SET last_error = %s WHERE task = %s",
                         (type(error).__name__, task))
            if isinstance(error, FeedRateLimited):
                conn.execute("UPDATE forentrace_maintenance SET next_due = now() + %s * interval '1 second' WHERE task = %s",
                             (error.retry_after, task))
            logger.error("%s failed (%s); the previous data remains available.", task, type(error).__name__)
            return False
        conn.execute("""
            UPDATE forentrace_maintenance SET last_success = now(), last_error = NULL,
                next_due = now() + %s * interval '1 minute' WHERE task = %s
        """, (minutes, task))
        logger.info("%s completed.", task)
        return True
    finally:
        conn.execute("SELECT pg_advisory_unlock(130518, %s)", (lock,))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true", help="Run only tasks that are due now")
    args = parser.parse_args()
    if database is None:
        parser.error("Configure PostgreSQL before running maintenance.")
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    tasks = [("cisa-kev", 10, settings.FORENTRACE_KEV_INTERVAL_MINUTES,
              lambda: import_official(allow_unchanged=True)),
             ("first-epss", 13, 1440, lambda: import_intelligence("first-epss"))]
    if settings.FORENTRACE_SYNC_ATTACK:
        tasks.append(("mitre-attack", 14, 10080, lambda: import_intelligence("mitre-attack")))
    if settings.FORENTRACE_OPENSEARCH_URL:
        tasks.append(("opensearch", 11, settings.FORENTRACE_PROJECTION_INTERVAL_MINUTES, sync_search))
    if settings.FORENTRACE_NEO4J_URI:
        tasks.append(("neo4j", 12, settings.FORENTRACE_PROJECTION_INTERVAL_MINUTES, sync_lineage))
    while True:
        try:
            with database.connect() as conn:
                conn.autocommit = True
                results = [run_due(conn, *task) for task in tasks]
        except OperationalError:
            logger.error("PostgreSQL is unavailable; maintenance will retry.")
            results = [False]
        if args.once:
            return int(not all(results))
        time.sleep(15)


if __name__ == "__main__":
    raise SystemExit(main())
