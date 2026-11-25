"""Pinned recovery source validation. No database writes or network operations."""
import hashlib
import json
from pathlib import Path
import re

MANIFEST = Path(__file__).with_name("recovery-sources.json")


def load_manifest(path=MANIFEST):
    manifest = json.loads(Path(path).read_text())
    if manifest["snapshot"] != "2026-04-23":
        raise ValueError("Unexpected recovery snapshot")
    if manifest["objectPrefix"] != "private/knowledge-tree/2026-04-23/":
        raise ValueError("Unexpected private source prefix")
    sources = manifest["sources"]
    kinds = ["locations", "people", "connect"] + ["authorPub"] * 7 + ["peopleGrant"]
    if [source["kind"] for source in sources] != kinds:
        raise ValueError("Recovery sources must be complete and in core-first order")
    names = set()
    for source in sources:
        name = source["name"]
        if not re.fullmatch(r"(locations|people|connect|authorPub(?:05|10|15|20|25|30|35)|peopleGrant)\.csv_\d+\.gz", name):
            raise ValueError("Invalid source filename")
        if name in names or not name.startswith(source["kind"]):
            raise ValueError("Duplicate or mismatched source")
        names.add(name)
        if not re.fullmatch(r"[a-f0-9]{64}", source["sha256"]):
            raise ValueError("Invalid source checksum")
        for key in ("bytes", "rowsRead", "rowsWritten", "rejected"):
            if type(source[key]) is not int or source[key] < 0:
                raise ValueError("Invalid source count")
        if source["bytes"] == 0 or source["rowsWritten"] + source["rejected"] > source["rowsRead"]:
            raise ValueError("Inconsistent source counts")
    if {s["name"].split(".")[0] for s in sources[3:10]} != {f"authorPub{n:02}" for n in range(5, 36, 5)}:
        raise ValueError("Missing publication shard")
    return manifest


def verify_source(path, source):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise ValueError("Source must be a regular file, not a symlink")
    if path.stat().st_size != source["bytes"]:
        raise ValueError("Source size differs from approved snapshot")
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != source["sha256"]:
        raise ValueError("Source checksum differs from approved snapshot")
