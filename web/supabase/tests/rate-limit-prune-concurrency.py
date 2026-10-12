"""SEC-013 follow-up: concurrent consume_rate_limit calls must not deadlock while pruning.

Several psql sessions repeatedly re-expire a shared set of keys (so every call has expired
rows to prune) and then call consume_rate_limit for their own key. A deadlock or any other
error in any session fails the run. Requires a DISPOSABLE database with all migrations.

  PERSONAUDIT_DISPOSABLE_DB=1 PGHOST=127.0.0.1 ... python3 rate-limit-prune-concurrency.py
Set PSQL to override the client command (default "psql -X -q").
"""
import concurrent.futures
import os
import shlex
import subprocess

if os.environ.get("PERSONAUDIT_DISPOSABLE_DB") != "1":
    raise SystemExit("Set PERSONAUDIT_DISPOSABLE_DB=1 and point at a disposable database.")

PSQL = shlex.split(os.environ.get("PSQL", "psql -X -q"))
SESSIONS = 8
ITERATIONS = 100
KEYS = 12


def run(sql: str) -> subprocess.CompletedProcess:
    return subprocess.run(PSQL, input=sql, capture_output=True, text=True)


def session(n: int) -> str:
    statements = []
    for i in range(ITERATIONS):
        statements.append(
            "insert into public.rate_limits(key, window_start, count) "
            f"select 'cc' || g, now() - interval '2 days', 1 from generate_series(0, {KEYS - 1}) g "
            "on conflict (key) do update set window_start = excluded.window_start;"
        )
        statements.append(f"select public.consume_rate_limit('cc{(n + i) % KEYS}', 1000000, 600);")
    return "\n".join(statements)


run("delete from public.rate_limits where key like 'cc%';")
with concurrent.futures.ThreadPoolExecutor(max_workers=SESSIONS) as pool:
    results = list(pool.map(lambda n: run(session(n)), range(SESSIONS)))
run("delete from public.rate_limits where key like 'cc%';")

errors = [r.stderr.strip() for r in results if r.stderr.strip()]
if errors:
    print("\n".join(errors[:5]))
    raise SystemExit(f"{len(errors)} of {SESSIONS} sessions reported errors (deadlock?)")
print(f"ok: {SESSIONS} sessions x {ITERATIONS} calls, no deadlock")
