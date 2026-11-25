"""Unit tests plus opt-in PostgreSQL tests using session-local TEMP tables only."""
import gzip
import hashlib
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
from unittest.mock import MagicMock
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import psycopg
from psycopg import sql
from psycopg.rows import dict_row
import owner_recovery as recovery


class GuardTests(unittest.TestCase):
    def test_remote_tls_required_and_prisma_parameter_removed(self):
        with self.assertRaises(recovery.RecoveryError):
            recovery.connection_url("postgresql://example.test/db?sslmode=disable")
        self.assertNotIn("schema=", recovery.connection_url("postgresql://example.test/db?schema=public"))
        self.assertIn("sslmode=require", recovery.connection_url("postgresql://example.test/db"))

    def test_fingerprint_excludes_password_but_binds_target(self):
        self.assertEqual(recovery.fingerprint("postgresql://user:one@example.test/db"),
                         recovery.fingerprint("postgresql://user:two@example.test/db"))
        self.assertNotEqual(recovery.fingerprint("postgresql://user:one@example.test/db"),
                            recovery.fingerprint("postgresql://user:one@example.test/other"))

    def test_counts_cannot_be_marked_complete_early(self):
        src = {"rowsRead": 10, "rowsWritten": 9, "rejected": 1}
        with self.assertRaises(recovery.RecoveryError):
            recovery.verify_checkpoint({"rows_read": 9, "rows_written": 9, "rejected": 0}, src)
        recovery.verify_checkpoint({"rows_read": 10, "rows_written": 9, "rejected": 1}, src)

    def test_target_allowlist(self):
        with self.assertRaises(KeyError):
            recovery.table("users")

    def test_missing_schema_refuses_preflight(self):
        conn = MagicMock()
        conn.execute.return_value.fetchone.return_value = {"bytes": 1}
        conn.execute.return_value.fetchall.return_value = []
        with self.assertRaisesRegex(recovery.RecoveryError, "missing"):
            recovery.preflight(conn, recovery.load_manifest(), 100)

    def test_workspace_run_refused_before_connect(self):
        with patch.dict(os.environ, {"REPLIT_DEV_DOMAIN": "test.invalid"}), \
             patch("sys.argv", ["owner_recovery.py", "--files", ".", "--max-database-gib", "20"]), \
             patch.object(psycopg, "connect") as connect:
            with self.assertRaisesRegex(recovery.RecoveryError, "outside"):
                recovery.main()
            connect.assert_not_called()


@unittest.skipUnless(os.getenv("KT_TEST_DATABASE") == "development" and os.getenv("REPLIT_DEV_DOMAIN"),
                     "Explicit development integration test opt-in required")
class DatabaseTests(unittest.TestCase):
    def setUp(self):
        if os.getenv("REPLIT_DEPLOYMENT") == "1":
            self.fail("Never run integration tests in production")
        # Managed development transport may use an internal non-TLS proxy.
        # Do not relax the owner's remote-production TLS guard for this fixture.
        parts = urlsplit(os.environ["DATABASE_URL"])
        query = dict(parse_qsl(parts.query))
        query.pop("schema", None)
        self.dsn = urlunsplit(parts._replace(query=urlencode(query)))
        self.conn = psycopg.connect(self.dsn, autocommit=True, row_factory=dict_row)
        self.addCleanup(self.conn.close)
        # All fixtures and writes stay in pg_temp; existing data is read only for shape.
        for kind in ("imports", "locations"):
            self.conn.execute(sql.SQL("CREATE TEMP TABLE {} (LIKE {} INCLUDING ALL)")
                              .format(sql.Identifier(recovery.TABLES[kind]), recovery.table(kind)))
        self.table_patch = patch.object(recovery, "table", lambda kind:
                                        sql.Identifier("pg_temp", recovery.TABLES[kind]))
        self.table_patch.start()
        self.addCleanup(self.table_patch.stop)
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = Path(self.tmp.name)
        self.path = self.folder / "locations.csv_fixture.gz"
        with gzip.open(self.path, "wt") as output:
            output.write("locid,location,country,lat,lon\n1,First,X,1,2\n2,Second,X,3,4\n2,Second,X,3,4\n3,Third,X,5,6\n")
        self.src = {"name": self.path.name, "kind": "locations",
                    "sha256": hashlib.sha256(self.path.read_bytes()).hexdigest(),
                    "bytes": self.path.stat().st_size, "rowsRead": 4,
                    "rowsWritten": 3, "rejected": 0}
        self.maximum = 10**15

    def test_commit_resume_and_idempotency(self):
        original = recovery.commit_batch
        def interrupt(conn, src, rows, position, rejected, maximum):
            original(conn, src, rows, position, rejected, maximum)
            raise RuntimeError("Simulated process interruption after committed batch")
        with patch.object(recovery, "commit_batch", side_effect=interrupt):
            with self.assertRaises(RuntimeError):
                recovery.import_source(self.conn, self.src, self.folder, 2, self.maximum)
        self.assertEqual(recovery.checkpoint(self.conn, self.src)["rows_read"], 2)
        recovery.import_source(self.conn, self.src, self.folder, 2, self.maximum)
        recovery.import_source(self.conn, self.src, self.folder, 2, self.maximum)
        record = recovery.checkpoint(self.conn, self.src)
        self.assertEqual(record["status"], "complete")
        self.assertEqual(record["rows_written"], 3)

    def test_bad_copy_rolls_back_rows_and_checkpoint(self):
        self.conn.execute(sql.SQL("INSERT INTO {}(name,kind,sha256,bytes) VALUES(%s,%s,%s,%s)")
                          .format(recovery.table("imports")),
                          (self.src["name"], "locations", self.src["sha256"], self.src["bytes"]))
        with self.assertRaises(psycopg.Error):
            recovery.commit_batch(self.conn, self.src, [["not-an-integer", "bad", None, None, None, None, None, None]],
                                  1, 0, self.maximum)
        self.assertEqual(recovery.checkpoint(self.conn, self.src)["rows_read"], 0)
        self.assertEqual(self.conn.execute("SELECT count(*) AS n FROM pg_temp.knowledge_tree_locations").fetchone()["n"], 0)

    def test_budget_exhaustion_prevents_batch(self):
        with self.assertRaisesRegex(recovery.RecoveryError, "budget"):
            recovery.commit_batch(self.conn, self.src, [], 0, 0, 1)

    def test_core_verification_and_degree_refresh(self):
        for kind in ("people", "connect"):
            self.conn.execute(sql.SQL("CREATE TEMP TABLE {} (LIKE {} INCLUDING ALL)").format(
                sql.Identifier(recovery.TABLES[kind]), sql.Identifier("public", recovery.TABLES[kind])))
        recovery.import_source(self.conn, self.src, self.folder, 2, self.maximum)
        self.conn.execute("INSERT INTO pg_temp.knowledge_tree_researchers(pid,full_name) VALUES(1,'Student'),(3,'Mentor')")
        self.conn.execute("INSERT INTO pg_temp.knowledge_tree_connections(cid,trainee_id,mentor_id,relation) VALUES(1,1,3,1)")
        sources = [self.src]
        for kind, count in (("people", 2), ("connect", 1)):
            src = {"name": kind, "kind": kind, "rowsRead": count, "rowsWritten": count, "rejected": 0}
            sources.append(src)
            self.conn.execute("""INSERT INTO pg_temp.knowledge_tree_imports
                (name,kind,sha256,bytes,rows_read,rows_written,rejected,status)
                VALUES(%s,%s,%s,1,%s,%s,0,'complete')""", (kind, kind, "a"*64, count, count))
        recovery.verify_core(self.conn, sources, self.maximum)
        degrees = self.conn.execute("SELECT connection_count FROM pg_temp.knowledge_tree_researchers ORDER BY pid").fetchall()
        self.assertEqual([row["connection_count"] for row in degrees], [1, 1])
        sources[1]["rowsWritten"] = 3
        with self.assertRaises(recovery.RecoveryError):
            recovery.verify_core(self.conn, sources, self.maximum)

    def test_checksum_mismatch_before_writes(self):
        self.path.write_bytes(b"x" * self.src["bytes"])
        with self.assertRaisesRegex(ValueError, "checksum"):
            recovery.import_source(self.conn, self.src, self.folder, 2, self.maximum)
        self.assertIsNone(recovery.checkpoint(self.conn, self.src))

    def test_connection_loss_does_not_reconnect(self):
        self.conn.close()
        with patch.object(psycopg, "connect") as reconnect:
            with self.assertRaises(psycopg.Error):
                recovery.commit_batch(self.conn, self.src, [], 0, 0, self.maximum)
            reconnect.assert_not_called()

    def test_concurrent_lock_released_on_disconnect(self):
        with psycopg.connect(self.dsn, autocommit=True) as other:
            # A test-only key avoids interfering with an owner recovery.
            key = 842031729
            self.assertTrue(self.conn.execute("SELECT pg_try_advisory_lock(%s) AS ok", (key,)).fetchone()["ok"])
            self.assertFalse(other.execute("SELECT pg_try_advisory_lock(%s)", (key,)).fetchone()[0])
            self.conn.close()
            # Remote backend observes TCP closure asynchronously.
            acquired = False
            for _ in range(100):
                acquired = other.execute("SELECT pg_try_advisory_lock(%s)", (key,)).fetchone()[0]
                if acquired:
                    break
                time.sleep(0.05)
            self.assertTrue(acquired)


if __name__ == "__main__":
    unittest.main()
