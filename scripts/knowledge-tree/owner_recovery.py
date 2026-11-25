#!/usr/bin/env python3
"""Owner-run DATA ONLY recovery. Never invoked by website build or startup."""
import argparse
import csv
import getpass
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import sys
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict
from psycopg.rows import dict_row
from recovery_sources import load_manifest, verify_source

spec = importlib.util.spec_from_file_location("source_import", Path(__file__).with_name("import.py"))
source_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_import)
LOCK = 842031727
TABLES = {kind: "knowledge_tree_" + table for kind, (table, _) in source_import.SPECS.items()}
TABLES["imports"] = "knowledge_tree_imports"
PRIMARY_KEYS = {"locations": ["locid"], "people": ["pid"], "connect": ["cid"],
                "authorPub": ["pubid", "pid"], "peopleGrant": ["row_key"], "imports": ["name"]}


class RecoveryError(Exception):
    pass


def table(kind):
    # Identifiers are fixed by source kind, never from CLI/user filenames.
    return sql.Identifier("public", TABLES[kind])


def connection_url(value):
    parts = urlsplit(value)
    if parts.scheme not in ("postgres", "postgresql") or not parts.hostname:
        raise RecoveryError("A PostgreSQL connection URL is required")
    query = dict(parse_qsl(parts.query))
    query.pop("schema", None)  # Prisma-only parameter, not accepted by libpq.
    if parts.hostname not in ("localhost", "127.0.0.1", "::1"):
        if query.get("sslmode", "require") not in ("require", "verify-ca", "verify-full"):
            raise RecoveryError("Remote database connections must use TLS")
        query.setdefault("sslmode", "require")
    return urlunsplit(parts._replace(query=urlencode(query)))


def fingerprint(dsn):
    info = conninfo_to_dict(dsn)
    # No password, connection URL or account identifier is printed.
    identity = [info.get(k, "") for k in ("host", "port", "dbname", "user")]
    return hashlib.sha256(json.dumps(identity).encode()).hexdigest()


def check_budget(conn, maximum):
    used = conn.execute("SELECT pg_database_size(current_database()) AS bytes").fetchone()["bytes"]
    if used >= maximum:
        raise RecoveryError("Database safety budget reached; resume after reviewing capacity")
    return used


def preflight(conn, manifest, maximum):
    check_budget(conn, maximum)
    # Browser verification/activation is authoritative once introduced. Do not
    # let this older owner utility write beneath a browser-issued certificate.
    guarded = conn.execute("""
        SELECT EXISTS(SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='knowledge_tree_imports'
          AND column_name='core_verification') AS present
    """).fetchone().get("present", False)
    if guarded and conn.execute("""
        SELECT 1 FROM public.knowledge_tree_imports
        WHERE core_verification IS NOT NULL LIMIT 1
    """).fetchone():
        raise RecoveryError("Browser core validation exists. Use the administrator browser workflow; no owner-tool writes were made.")
    for kind, name in TABLES.items():
        rows = conn.execute(
            """SELECT column_name FROM information_schema.columns
               WHERE table_schema='public' AND table_name=%s""", (name,)
        ).fetchall()
        required = set(source_import.SPECS[kind][1]) if kind != "imports" else {
            "name", "kind", "sha256", "bytes", "snapshot", "rows_read",
            "rows_written", "rejected", "status", "error", "updated_at"}
        if not required.issubset({r["column_name"] for r in rows}):
            raise RecoveryError("Published Knowledge Tree tables are missing required columns")
        safe = conn.execute(
            """SELECT c.relkind, c.relrowsecurity,
               EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal) AS triggers
               FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=%s""", (name,)
        ).fetchone()
        if not safe or safe["relkind"] != "r" or safe["relrowsecurity"] or safe["triggers"]:
            raise RecoveryError("Unexpected table type, row policy or trigger; manual review required")
        keys = conn.execute("""
            SELECT a.attname FROM pg_index i
            JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
            CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ord)
            JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
            WHERE n.nspname='public' AND c.relname=%s AND i.indisprimary ORDER BY k.ord
        """, (name,)).fetchall()
        if [k["attname"] for k in keys] != PRIMARY_KEYS[kind]:
            raise RecoveryError("Unexpected primary key; deduplication cannot be guaranteed")
    expected = {s["name"]: s for s in manifest["sources"]}
    records = conn.execute(sql.SQL("SELECT * FROM {}").format(table("imports"))).fetchall()
    for record in records:
        src = expected.get(record["name"])
        if not src or record["sha256"] != src["sha256"] or record["kind"] != src["kind"]:
            raise RecoveryError("Existing import records do not match the approved snapshot")
        if str(record["snapshot"]) != manifest["snapshot"] or record["bytes"] != src["bytes"]:
            raise RecoveryError("Existing import metadata differs from the approved snapshot")
        if (not 0 <= record["rows_read"] <= src["rowsRead"]
                or not 0 <= record["rows_written"] <= src["rowsWritten"]
                or not 0 <= record["rejected"] <= src["rejected"]
                or record["status"] not in ("pending", "importing", "failed", "complete")):
            raise RecoveryError("Invalid existing checkpoint")
    # Refuse pre-populated untracked data rather than silently adopting it.
    tracked = {r["kind"] for r in records}
    for kind in source_import.SPECS:
        if kind not in tracked and conn.execute(
            sql.SQL("SELECT 1 FROM {} LIMIT 1").format(table(kind))
        ).fetchone():
            raise RecoveryError("Untracked rows exist in recovery tables; manual review required")


def checkpoint(conn, src):
    return conn.execute(sql.SQL("SELECT * FROM {} WHERE name=%s").format(table("imports")),
                        (src["name"],)).fetchone()


def verify_checkpoint(record, src):
    if (not record or record["rows_read"] != src["rowsRead"]
            or record["rows_written"] != src["rowsWritten"]
            or record["rejected"] != src["rejected"]):
        raise RecoveryError("Import counts differ from the pinned source; not marking complete")


def commit_batch(conn, src, rows, position, rejected, maximum):
    check_budget(conn, maximum)
    columns = sql.SQL(",").join(map(sql.Identifier, source_import.SPECS[src["kind"]][1]))
    with conn.transaction():
        conn.execute("SET LOCAL statement_timeout='120s'")
        conn.execute(sql.SQL(
            "CREATE TEMP TABLE kt_recovery_stage (LIKE {} INCLUDING DEFAULTS) ON COMMIT DROP"
        ).format(table(src["kind"])))
        with conn.cursor().copy(sql.SQL("COPY kt_recovery_stage ({}) FROM STDIN").format(columns)) as copy:
            for row in rows:
                copy.write_row(row)
        conn.execute(sql.SQL("""
            WITH inserted AS (
              INSERT INTO {} ({}) SELECT {} FROM kt_recovery_stage
              ON CONFLICT DO NOTHING RETURNING 1
            )
            UPDATE {} SET rows_read=%s,rows_written=rows_written+(SELECT count(*) FROM inserted),
              rejected=%s,status='importing',error=NULL,updated_at=now() WHERE name=%s
        """).format(table(src["kind"]), columns, columns, table("imports")),
                     (position, rejected, src["name"]))


def import_source(conn, src, folder, batch_size, maximum):
    record = checkpoint(conn, src)
    if record and record["status"] == "complete":
        verify_checkpoint(record, src)
        return
    path = folder / src["name"]
    verify_source(path, src)  # Validate all bytes before any writes for this file.
    conn.execute(sql.SQL("""
        INSERT INTO {} (name,kind,sha256,bytes) VALUES (%s,%s,%s,%s)
        ON CONFLICT(name) DO NOTHING
    """).format(table("imports")), (src["name"], src["kind"], src["sha256"], src["bytes"]))
    record = checkpoint(conn, src)
    resume, rejected = record["rows_read"], record["rejected"]
    position, rows = 0, []
    with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        headers = reader.fieldnames
        if not headers or len(set(headers)) != len(headers) or not source_import.REQUIRED[src["kind"]].issubset(headers):
            raise RecoveryError("Unexpected source header")
        for position, row in enumerate(reader, 1):
            if position <= resume:
                continue
            try:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("Invalid CSV row")
                rows.append(source_import.normalize(src["kind"], row))
            except (ValueError, TypeError, OverflowError):
                rejected += 1
            if rejected > src["rejected"] or position > src["rowsRead"]:
                raise RecoveryError("Unexpected rejected rows or source length")
            if position % batch_size == 0:
                commit_batch(conn, src, rows, position, rejected, maximum)
                rows = []
                print(json.dumps({"file": src["name"], "rowsRead": position}), flush=True)
        if rows or position > resume:
            commit_batch(conn, src, rows, position, rejected, maximum)
    verify_checkpoint(checkpoint(conn, src), src)
    conn.execute(sql.SQL("UPDATE {} SET status='complete',error=NULL,updated_at=now() WHERE name=%s")
                 .format(table("imports")), (src["name"],))
    conn.execute(sql.SQL("ANALYZE {}").format(table(src["kind"])))
    print(json.dumps({"file": src["name"], "status": "complete"}), flush=True)


def verify_core(conn, sources, maximum):
    check_budget(conn, maximum)
    for src in sources[:3]:
        record = checkpoint(conn, src)
        verify_checkpoint(record, src)
        if record["status"] != "complete":
            raise RecoveryError("Core import is incomplete")
        count = conn.execute(sql.SQL("SELECT count(*) AS n FROM {}").format(table(src["kind"]))).fetchone()["n"]
        if count != src["rowsWritten"]:
            raise RecoveryError("Core table row count mismatch")
    # Preserve raw orphan/affiliation rows, but only valid endpoints enter degrees.
    conn.execute(sql.SQL("""UPDATE {people} p SET connection_count=d.n FROM (
        SELECT pid,count(*)::integer AS n FROM (
          SELECT c.trainee_id AS pid FROM {connections} c
          JOIN {people} a ON a.pid=c.trainee_id
          JOIN {people} b ON b.pid=c.mentor_id
          WHERE c.mentor_id>0 AND c.trainee_id<>c.mentor_id AND c.relation BETWEEN 0 AND 3
          UNION ALL
          SELECT c.mentor_id AS pid FROM {connections} c
          JOIN {people} a ON a.pid=c.trainee_id
          JOIN {people} b ON b.pid=c.mentor_id
          WHERE c.mentor_id>0 AND c.trainee_id<>c.mentor_id AND c.relation BETWEEN 0 AND 3
        ) ends GROUP BY pid) d
        WHERE p.pid=d.pid AND p.connection_count IS DISTINCT FROM d.n""")
        .format(people=table("people"), connections=table("connect")))
    print("Core counts verified and connection counts refreshed. Application cutover still requires review.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--files", type=Path, required=True)
    parser.add_argument("--scope", choices=["core", "all"], default="core")
    parser.add_argument("--max-database-gib", type=int, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-target", default="")
    parser.add_argument("--batch-size", type=int, default=20000)
    args = parser.parse_args()
    if not 1 <= args.batch_size <= 50000 or args.max_database_gib < 1:
        raise RecoveryError("Invalid batch size or reviewed storage budget")
    # This command is for the owner's separate machine, not a website deployment.
    if os.getenv("REPLIT_DEPLOYMENT") == "1" or os.getenv("REPLIT_DEV_DOMAIN"):
        raise RecoveryError("Run this owner-only tool outside the Replit website/workspace")
    dsn = connection_url(os.getenv("KT_RECOVERY_DATABASE_URL") or getpass.getpass("Production database URL (hidden): "))
    target = fingerprint(dsn)
    if args.apply and args.confirm_target != target:
        raise RecoveryError("Target confirmation does not match; run read-only preflight first")
    manifest = load_manifest()
    sources = manifest["sources"] if args.scope == "all" else manifest["sources"][:3]
    csv.field_size_limit(16 * 1024 * 1024)
    maximum = args.max_database_gib * 1024**3
    with psycopg.connect(dsn, autocommit=True, row_factory=dict_row, connect_timeout=15) as conn:
        conn.execute("SET statement_timeout='10min'")
        conn.execute("SET lock_timeout='5s'")
        if not args.apply:
            conn.execute("SET default_transaction_read_only=on")
        # Lock lives on the SAME connection as all writes; no reconnect on loss.
        if not conn.execute("SELECT pg_try_advisory_lock(%s) AS locked", (LOCK,)).fetchone()["locked"]:
            raise RecoveryError("Another recovery process is running")
        preflight(conn, manifest, maximum)
        for src in sources:
            verify_source(args.files / src["name"], src)
        if not args.apply:
            print(json.dumps({"preflight": "passed", "targetFingerprint": target,
                              "scope": args.scope, "databaseBytes": check_budget(conn, maximum)}))
            return
        for src in sources:
            try:
                import_source(conn, src, args.files, args.batch_size, maximum)
            except Exception:
                # Never persist credentials, SQL input rows or raw exception messages.
                if not conn.closed:
                    conn.execute(sql.SQL("UPDATE {} SET status='failed',error='Recovery stopped; inspect owner console',updated_at=now() WHERE name=%s")
                                 .format(table("imports")), (src["name"],))
                raise
            if src["kind"] == "connect":
                verify_core(conn, manifest["sources"], maximum)
        for kind in {s["kind"] for s in sources}:
            expected = sum(s["rowsWritten"] for s in sources if s["kind"] == kind)
            actual = conn.execute(sql.SQL("SELECT count(*) AS n FROM {}").format(table(kind))).fetchone()["n"]
            if actual != expected:
                raise RecoveryError("Final table counts differ from the approved dataset")
        print("Requested import scope completed. Do not switch the website until API/search verification passes.")


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted. Committed batches are retained; rerun to resume.", file=sys.stderr)
        sys.exit(130)
    except RecoveryError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        # psycopg errors can include credentials or COPY rows: only SQLSTATE is safe.
        print(f"Recovery stopped ({type(error).__name__}, SQLSTATE={getattr(error, 'sqlstate', None)}). No automatic reconnect.", file=sys.stderr)
        sys.exit(1)
