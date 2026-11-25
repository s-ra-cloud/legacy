#!/usr/bin/env python3
"""Streaming, checkpointed data-only importer. No persistent schema DDL."""
import argparse
import csv
import gzip
import hashlib
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlparse, parse_qs, unquote

SPECS = {
    "locations": ("locations", ["locid", "location", "shortname", "city", "state", "country", "lat", "lon"]),
    "people": ("researchers", ["pid", "full_name", "firstname", "middlename", "lastname", "degrees", "location", "locid", "area", "majorarea", "award", "hindex", "orcid_id", "s2id", "ktpid", "homepage"]),
    "connect": ("connections", ["cid", "trainee_id", "mentor_id", "relation", "location", "locid", "stopdate", "dissertation_title", "pqid", "ktcid"]),
    "authorPub": ("publications", ["pubid", "pid", "score_total", "score_human", "score_coa", "pmid", "doi", "s2id", "citations"]),
    "peopleGrant": ("grants", ["row_key", "grantid", "pid", "score", "score_human", "score_name", "score_loc", "fedex_pi_id", "fedex_name", "application_id", "budget_start", "full_project_num", "importdate", "dborigin"]),
}
REQUIRED = {
    "locations": {"locid", "location", "country", "lat", "lon"},
    "people": {"pid", "firstname", "middlename", "lastname", "location", "locid", "majorarea"},
    "connect": {"cid", "pid1", "pid2", "relation", "locid", "stopdate"},
    "authorPub": {"pubid", "pid", "score_total", "score_human", "pmid", "doi", "s2id", "citations"},
    "peopleGrant": {"grantid", "pid", "score", "score_human", "APPLICATION_ID", "FULL_PROJECT_NUM", "BUDGET_START"},
}
INTS = {"pid", "locid", "hindex", "cid", "trainee_id", "mentor_id", "relation", "pubid", "score_human", "citations", "grantid"}
FLOATS = {"lat", "lon", "score", "score_total", "score_name", "score_loc", "score_coa"}

def literal(value):
    return "'" + str(value).replace("'", "''") + "'"

def pg_environment():
    # Prisma URLs can include ?schema=public, which libpq does not accept.
    # Pass credentials only through the child environment, never argv or logs.
    url = urlparse(os.environ["DATABASE_URL"])
    query = parse_qs(url.query)
    return dict(os.environ, PGHOST=url.hostname or "", PGPORT=str(url.port or 5432),
                PGUSER=unquote(url.username or ""), PGPASSWORD=unquote(url.password or ""),
                PGDATABASE=unquote(url.path.lstrip("/")),
                PGSSLMODE=query.get("sslmode", ["prefer"])[0], PGCONNECT_TIMEOUT="15")

def run_sql(statement):
    env = pg_environment()
    result = subprocess.run(["psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
                            input=statement, text=True, capture_output=True, env=env)
    if result.returncode:
        # COPY errors may include entire input rows. Keep only the error summary.
        summary = next((line for line in result.stderr.splitlines() if "ERROR:" in line), "Database operation failed")
        raise RuntimeError(summary[:250])
    return result.stdout.strip()

def clean(value):
    return None if value is None or value.strip() in ("", "NULL", "\\N") else value.strip()

def normalize(kind, row):
    values = {key.lower(): clean(value) for key, value in row.items()}
    if kind == "people":
        values["full_name"] = " ".join(values.get(key) or "" for key in ("firstname", "middlename", "lastname")).strip()
        values["full_name"] = " ".join(values["full_name"].split())
    if kind == "connect":
        values["trainee_id"], values["mentor_id"] = values.get("pid1"), values.get("pid2")
    required_ids = {
        "locations": ("locid",),
        "people": ("pid",),
        "connect": ("cid", "trainee_id", "mentor_id"),
        "authorPub": ("pubid", "pid"),
        "peopleGrant": ("pid",),
    }
    for key in required_ids[kind]:
        if values.get(key) is None:
            raise ValueError(f"Missing required identifier: {key}")
    if kind == "peopleGrant":
        values["row_key"] = hashlib.sha256(json.dumps(values, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    columns = SPECS[kind][1]
    result = []
    for column in columns:
        value = values.get(column)
        if value is not None and column in INTS:
            value = str(int(value))
        if value is not None and column in FLOATS:
            number = float(value)
            if not math.isfinite(number):
                value = None
            else:
                value = str(number)
        result.append(value)
    return result

def copy_cell(value):
    if value is None:
        return "\\N"
    return str(value).replace("\\", "\\\\").replace("\0", "").replace("\t", "\\t").replace("\r", "\\r").replace("\n", "\\n")

def commit_batch(kind, filename, batch, row_number, rejected):
    table, columns = SPECS[kind]
    names = ",".join(columns)
    data = "".join("\t".join(copy_cell(value) for value in row) + "\n" for row in batch)
    # COPY + insert + progress checkpoint are one transaction. A crash rolls all back.
    statement = f"""BEGIN;
SET LOCAL statement_timeout = '120s';
CREATE TEMP TABLE kt_stage (LIKE knowledge_tree.{table} INCLUDING DEFAULTS) ON COMMIT DROP;
COPY kt_stage ({names}) FROM STDIN;
{data}\\.
WITH inserted AS (
  INSERT INTO knowledge_tree.{table} ({names}) SELECT {names} FROM kt_stage
  ON CONFLICT DO NOTHING RETURNING 1
)
UPDATE knowledge_tree.imports SET rows_read={row_number},
 rows_written=rows_written+(SELECT count(*) FROM inserted),
 rejected={rejected}, status='importing',error=NULL,updated_at=now()
 WHERE name={literal(filename)};
COMMIT;
"""
    run_sql(statement)

def import_file(path, kind, batch_size):
    digest = hashlib.file_digest(path.open("rb"), "sha256").hexdigest()
    previous = run_sql(f"SELECT json_build_object('sha',sha256,'row',rows_read,'status',status,'rejected',rejected) FROM knowledge_tree.imports WHERE name={literal(path.name)};")
    checkpoint = json.loads(previous) if previous else {}
    if checkpoint and checkpoint["sha"] != digest:
        raise ValueError("Source checksum changed; use a separately reviewed snapshot")
    if checkpoint.get("status") == "complete":
        print(json.dumps({"file": path.name, "status": "already complete"}), flush=True)
        return
    run_sql(f"""INSERT INTO knowledge_tree.imports(name,kind,sha256,bytes)
      VALUES({literal(path.name)},{literal(kind)},{literal(digest)},{path.stat().st_size})
      ON CONFLICT(name) DO UPDATE SET kind=excluded.kind;""")
    resume = int(checkpoint.get("row", 0))
    rejected = int(checkpoint.get("rejected", 0))
    row_number = 0
    with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or not REQUIRED[kind].issubset(reader.fieldnames):
            raise ValueError("Unexpected CSV header: " + str(reader.fieldnames))
        if len(set(reader.fieldnames)) != len(reader.fieldnames):
            raise ValueError("Duplicate CSV header")
        batch = []
        for row_number, row in enumerate(reader, 1):
            if row_number <= resume:
                continue
            try:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("CSV column count mismatch")
                batch.append(normalize(kind, row))
            except (ValueError, TypeError, OverflowError) as error:
                rejected += 1
                print(json.dumps({"file": path.name, "row": row_number, "error": type(error).__name__}), flush=True)
            if row_number % batch_size == 0:
                if row_number % 1000000 == 0:
                    used = int(run_sql("SELECT pg_database_size(current_database());"))
                    budget = int(os.getenv("KT_IMPORT_MAX_DATABASE_BYTES", str(18 * 1024**3)))
                    if used >= budget:
                        raise RuntimeError("Database safety budget reached; import paused to protect existing application data")
                commit_batch(kind, path.name, batch, row_number, rejected)
                batch = []
                print(json.dumps({"file": path.name, "rowsRead": row_number, "rejected": rejected}), flush=True)
        if batch or row_number > resume:
            commit_batch(kind, path.name, batch, row_number, rejected)
    run_sql(f"UPDATE knowledge_tree.imports SET status='complete',updated_at=now() WHERE name={literal(path.name)}; ANALYZE knowledge_tree.{SPECS[kind][0]};")
    print(json.dumps({"file": path.name, "status": "complete", "rowsRead": row_number, "rejected": rejected}), flush=True)

def refresh_degrees():
    run_sql("""UPDATE knowledge_tree.researchers p SET connection_count=d.n FROM (
      SELECT pid,count(*)::integer AS n FROM (
        SELECT c.trainee_id AS pid FROM knowledge_tree.connections c
        JOIN knowledge_tree.researchers a ON a.pid=c.trainee_id
        JOIN knowledge_tree.researchers b ON b.pid=c.mentor_id
        WHERE c.mentor_id>0 AND c.trainee_id<>c.mentor_id AND c.relation BETWEEN 0 AND 3
        UNION ALL
        SELECT c.mentor_id AS pid FROM knowledge_tree.connections c
        JOIN knowledge_tree.researchers a ON a.pid=c.trainee_id
        JOIN knowledge_tree.researchers b ON b.pid=c.mentor_id
        WHERE c.mentor_id>0 AND c.trainee_id<>c.mentor_id AND c.relation BETWEEN 0 AND 3
      ) all_ends GROUP BY pid
    ) d WHERE p.pid=d.pid AND p.connection_count IS DISTINCT FROM d.n;
    ANALYZE knowledge_tree.researchers;""")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--development", action="store_true", required=True)
    parser.add_argument("--files", type=Path, required=True)
    parser.add_argument("--core-only", action="store_true")
    parser.add_argument("--batch-size", type=int, default=50000)
    args = parser.parse_args()
    if os.getenv("REPLIT_DEPLOYMENT") == "1" or os.getenv("NODE_ENV") == "production":
        sys.exit("This entrypoint is development-only; no production data was modified.")
    if not os.getenv("DATABASE_URL"):
        sys.exit("DATABASE_URL must be supplied securely.")
    csv.field_size_limit(16 * 1024 * 1024)
    # Keep one separate session alive holding the import lock across batch sessions.
    env = pg_environment()
    lock = subprocess.Popen(["psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env=env)
    lock.stdin.write("SELECT pg_try_advisory_lock(842031726);\n")
    lock.stdin.flush()
    if lock.stdout.readline().strip() != "t":
        lock.terminate()
        sys.exit("Another Knowledge Tree importer is running.")
    try:
        for kind in ("locations", "people", "connect", "authorPub", "peopleGrant"):
            if args.core_only and kind in ("authorPub", "peopleGrant"):
                continue
            pattern = f"{kind}[0-9]*.gz" if kind == "authorPub" else f"{kind}.csv*.gz"
            paths = sorted(args.files.glob(pattern))
            if not paths:
                raise ValueError("Missing source file for " + kind)
            for path in paths:
                try:
                    import_file(path, kind, args.batch_size)
                except Exception as error:
                    run_sql(f"UPDATE knowledge_tree.imports SET status='failed',error={literal(type(error).__name__ + ': ' + str(error)[:250])},updated_at=now() WHERE name={literal(path.name)};")
                    raise
            if kind == "connect":
                refresh_degrees()
    finally:
        lock.stdin.close()
        lock.wait(timeout=10)

if __name__ == "__main__":
    main()
