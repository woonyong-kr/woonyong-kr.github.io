"""Read-only local gate. Run in an environment with the canonical Woon producer."""
import argparse
from pathlib import Path

from woon_core.knowledge.public_projection import prepare_public_projection

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--vault', required=True, type=Path)
parser.add_argument('--site', type=Path, default=Path(__file__).resolve().parents[1])
args = parser.parse_args()
report = prepare_public_projection(args.vault, args.site)
expected = {document.relative_path.as_posix(): document.content for document in report.documents}
actual = {path.relative_to(report.content_root).as_posix(): path.read_bytes()
          for path in report.content_root.rglob('*') if path.is_file() and path.name != 'README.md'}
missing = sorted(expected.keys() - actual.keys())
extra = sorted(actual.keys() - expected.keys())
changed = sorted(name for name in expected.keys() & actual.keys() if expected[name] != actual[name])
print(f'Producer bytes: {len(expected)} documents; missing={len(missing)}, extra={len(extra)}, changed={len(changed)}')
if missing or extra or changed:
    raise SystemExit('Projection differs from the canonical producer; regenerate through the producer, never patch generated Markdown.')
