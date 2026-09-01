from pathlib import Path
import os
import sys
from typing import Any, cast

from hdlregression import HDLRegression

ROOT = Path(__file__).resolve().parent
REPOSITORY_ROOT = ROOT.parents[1]
UVVM = Path(os.environ["UVVM_ROOT"]) if os.environ.get("UVVM_ROOT") else REPOSITORY_ROOT.parent / "UVVM"

if not UVVM.exists():
    raise SystemExit("UVVM source was not found. Set UVVM_ROOT to a UVVM checkout or place UVVM beside the repository.")

hr = HDLRegression(simulator="GHDL", output_path=str(ROOT / "hdlregression"))

hr.add_files(str(UVVM / "uvvm_util" / "src" / "*.vhd"), "uvvm_util")
hr.add_files(str(UVVM / "uvvm_vvc_framework" / "src" / "*.vhd"), "uvvm_vvc_framework")
hr.add_files(str(UVVM / "bitvis_vip_scoreboard" / "src" / "*.vhd"), "bitvis_vip_scoreboard")

for vip in ("bitvis_vip_sbi", "bitvis_vip_axistream", "bitvis_vip_clock_generator"):
    hr.add_files(str(UVVM / vip / "src" / "*.vhd"), vip)
    hr.add_files(str(UVVM / "uvvm_vvc_framework" / "src_target_dependent" / "*.vhd"), vip)

hr.add_file(str(ROOT / "src" / "fibonacci_axis.vhd"), "work")
hr.add_file(str(ROOT / "tb" / "fibonacci_axis_tb_pkg.vhd"), "work")
hr.add_file(str(ROOT / "tb" / "fibonacci_axis_th.vhd"), "work")
hr.add_file(str(ROOT / "tb" / "fibonacci_axis_tb.vhd"), "work")

hr.set_simulator(
    simulator="GHDL",
    # HDLRegression accepts a list here, although its type stub declares str.
    com_options=cast(Any, [
        "--ieee=standard",
        "--std=08",
        "-frelaxed",
        "-frelaxed-rules",
        "--warn-no-shared",
        "--warn-no-elaboration",
        "--warn-no-hide",
        "--warn-no-delayed-checks",
    ]),
)

hr.start(regression_mode=True)

if hr.get_num_pass_tests() == 0:
    sys.exit(1)
sys.exit(0 if hr.check_run_results(exp_fail=0) else 1)
