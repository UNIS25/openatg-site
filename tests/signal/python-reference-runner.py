import hashlib
import json
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = REPOSITORY_ROOT / "tests" / "signal" / "fixtures"
REFERENCE_ROOT = Path("/Users/adrianvasu/Desktop/ATG-SIGNAL/atg-signal-deploy")

sys.path.insert(0, str(REFERENCE_ROOT))

from top_posts_core import process_report, read_file  # noqa: E402
from week_comparison_core import compare_reports, read_report  # noqa: E402


def records(dataframe):
    return json.loads(dataframe.to_json(orient="records", force_ascii=False))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = json.loads((FIXTURE_ROOT / "manifest.json").read_text(encoding="utf-8"))
result = {
    "reference_hashes": {
        "top_posts_core.py": sha256(REFERENCE_ROOT / "top_posts_core.py"),
        "week_comparison_core.py": sha256(REFERENCE_ROOT / "week_comparison_core.py"),
    },
    "top": {},
    "comparison": {},
}

for platform, relative_path in manifest["top"].items():
    fixture = FIXTURE_ROOT / relative_path
    dataframe = read_file(fixture.read_bytes(), fixture.name, platform=platform)
    report = process_report(
        dataframe,
        platform,
        manifest["reportingPeriod"]["start"],
        manifest["reportingPeriod"]["end"],
    )
    result["top"][platform] = records(report)

for platform, fixture_pair in manifest["comparison"].items():
    before_path = FIXTURE_ROOT / fixture_pair[0]
    review_path = FIXTURE_ROOT / fixture_pair[1]
    before = read_report(before_path.read_bytes(), platform)
    review = read_report(review_path.read_bytes(), platform)
    result["comparison"][platform] = records(compare_reports(platform, before, review))

output_path = Path(sys.argv[1])
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
