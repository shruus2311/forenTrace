from datetime import datetime

from pydantic import BaseModel


class Alert(BaseModel):
    kind: str
    first_at: datetime
    last_at: datetime
    occurrences: int


def record_alert(conn, scope: str, target: str, kind: str) -> None:
    conn.execute("""
        INSERT INTO forentrace_alerts (scope, target, kind, bucket)
        VALUES (%s, %s, %s, date_bin(interval '15 minutes', now(), timestamptz '2000-01-01 UTC'))
        ON CONFLICT (scope, target, kind, bucket) DO UPDATE SET
        last_at = now(), occurrences = forentrace_alerts.occurrences + 1
    """, (scope, target, kind))


def list_alerts(conn, scope: str, target: str) -> list[Alert]:
    return [Alert(kind=kind, first_at=first, last_at=last, occurrences=count)
            for kind, first, last, count in conn.execute("""
        SELECT kind, first_at, last_at, occurrences FROM forentrace_alerts
        WHERE scope = %s AND target = %s ORDER BY last_at DESC, kind LIMIT 50
    """, (scope, target))]
