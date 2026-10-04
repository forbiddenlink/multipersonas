"""Exercise real queue contention on an explicitly disposable local Postgres.

Requires psql and PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD plus
PERSONAUDIT_DISPOSABLE_DB=1. Never starts browsers or makes model calls.
"""
import concurrent.futures
import json
import os
import subprocess
import time
import uuid

if os.environ.get("PERSONAUDIT_DISPOSABLE_DB") != "1" or os.environ.get("PGHOST") not in (
    "127.0.0.1", "localhost", "::1",
):
    raise SystemExit("Set PERSONAUDIT_DISPOSABLE_DB=1 and a loopback PGHOST for a disposable database.")

prefix = f"queue-test:{uuid.uuid4()}"


def sql(statement):
    return subprocess.run(
        ["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", statement],
        check=True, capture_output=True, text=True, timeout=30,
    ).stdout.strip()


def enqueue(key, cap, rate):
    return json.loads(sql(
        "select row_to_json(r) from public.enqueue_grade_scan("
        f"'https://example.invalid/{prefix}', '{key}', {cap}, {rate}, 600) r"
    ))


def burst(count, action):
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        return list(pool.map(action, range(count)))


def clear_jobs():
    # Never remove unrelated queue rows, even when a test fails midway.
    sql(f"delete from public.grader_scans where entry_url = 'https://example.invalid/{prefix}';"
        f"delete from public.audit_jobs where url = 'https://example.invalid/{prefix}';")


# Claims cannot be scoped to a test: require an empty, disposable queue first.
if sql("select (select count(*) from public.audit_jobs) + (select count(*) from public.grader_scans)") != "0":
    raise SystemExit("Refusing to claim jobs from a nonempty database.")

started = time.monotonic()
try:
    admission = burst(64, lambda i: enqueue(f"{prefix}:capacity:{i}", 8, 5))
    accepted = [row for row in admission if row["status"] == "queued"]
    assert len(accepted) == 8, f"Queue capacity over/underrun: {len(accepted)}"
    assert sum(row["status"] == "busy" for row in admission) == 56
    assert len({row["job_id"] for row in accepted}) == 8
    assert sql("select count(*) from public.grader_scans") == "8"
    assert sql(f"select coalesce(sum(count),0) from public.rate_limits where key like '{prefix}:%'") == "8"
    clear_jobs()

    admission = burst(32, lambda _: enqueue(f"{prefix}:shared-caller", 100, 5))
    accepted = [row for row in admission if row["status"] == "queued"]
    assert len(accepted) == 5, f"Caller limit over/underrun: {len(accepted)}"
    assert sum(row["status"] == "rate_limited" for row in admission) == 27
    # The rate counter records all attempts, including denied requests.
    assert sql(f"select count from public.rate_limits where key = '{prefix}:shared-caller'") == "32"
    claimed = burst(32, lambda _: sql("select id from public.claim_audit_job()"))
    claimed = [job for job in claimed if job]
    assert len(claimed) == len(set(claimed)) == 5, "Duplicate or missing claims"
    assert set(claimed) == {row["job_id"] for row in accepted}
    assert sql("select count(*) from public.audit_jobs where status = 'running' and attempts = 1") == "5"

    # Simulate a crashed worker, then contend over the same stale rows.
    sql("update public.audit_jobs set started_at = now() - interval '20 minutes'")
    recovered = burst(16, lambda _: int(sql("select public.reap_stale_audit_jobs(600,3)")))
    assert sum(recovered) == 5, f"Recovery counts duplicate or omit jobs: {recovered}"
    reclaimed = burst(32, lambda _: sql("select id from public.claim_audit_job()"))
    reclaimed = [job for job in reclaimed if job]
    assert len(reclaimed) == len(set(reclaimed)) == 5
    assert set(reclaimed) == set(claimed)
    assert sql("select count(*) from public.audit_jobs where status = 'running' and attempts = 2") == "5"
    print(json.dumps({
        "capacity": {"requests": 64, "accepted": 8, "busy": 56},
        "rate_limit": {"requests": 32, "accepted": 5, "limited": 27},
        "claims": {"requests": 32, "unique": 5, "duplicates": 0},
        "recovery": {"requests": 16, "recovered": 5, "unique_reclaims": 5},
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "scope": "local database contention only; not browser throughput or production capacity",
    }, indent=2))
finally:
    clear_jobs()
    sql(f"delete from public.rate_limits where key like '{prefix}:%'")
