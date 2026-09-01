# UVVM TB Scaffold Demonstrator

A complete, runnable proof project for UVVM TB Scaffold. It is deliberately small enough to understand in one sitting while exercising the exact testbench/test-harness split that a developer needs in practice.

## DUT: `fibonacci_axis`

The DUT is a synthesizable 8-bit streaming Fibonacci transformer.

- **AXI-Stream input:** accepts an unsigned Fibonacci index when enabled.
- **AXI-Stream output:** emits `$F(n) \bmod 256$` with `tuser`, `tkeep`, and `tlast` propagated.
- **SBI register interface:**

| Address | Name | Behavior |
| --- | --- | --- |
| `0x0` | Control | Bit `0` enables stream processing. Bit `1` clears the accepted-word counter. |
| `0x1` | Accepted count | Read-only count of accepted AXI-Stream words. |
| `0x2` | Last result | Read-only result of the most recently accepted index. |

The test drives the inputs `0, 1, 2, 5, 8, 10`, checks the expected output sequence `0, 1, 1, 5, 21, 55`, then verifies SBI status registers.

## Current TB Scaffold layout

The saved [fibonacci_axis.uvvm-tb-scaffold.json](fibonacci_axis.uvvm-tb-scaffold.json) uses the current graphical placement model:

- Clock-generator VVC instance `1` in **TH Free**.
- SBI VVC instance `1` at **SW Interface**.
- AXI-Stream source VVC instance `1` at **Input**.
- AXI-Stream sink VVC instance `2` at **Output**.
- Reset, activity watchdog, and scoreboard hooks.
- Explicit VVC colors that are restored when the profile is loaded.

The actual [fibonacci_axis_th.vhd](tb/fibonacci_axis_th.vhd) follows the same generated ordering and completes the deliberate developer-owned work: the DUT port map, active-high reset behavior, and output-handshake monitor. [fibonacci_axis_tb.vhd](tb/fibonacci_axis_tb.vhd) uses the generated-style `p_sequencer` process to add domain-specific transactions and expected Fibonacci values.

## Scoreboard evidence

The harness monitors every completed AXI-Stream output handshake and sends the data to a UVVM generic scoreboard. The testbench:

1. Adds every expected Fibonacci result before issuing its VVC commands.
2. Uses the AXI-Stream sink VVC to independently expect the output.
3. Checks that the generic scoreboard is empty after traffic.
4. Prints `FIBONACCI_STREAM_SCOREBOARD` counters into the simulator transcript.

This gives both protocol-level VVC checking and a visible test-level scoreboard record.

## Run with GHDL

From this directory in PowerShell, with the UVVM source checkout available either as a sibling `UVVM` directory or through `UVVM_ROOT`:

```powershell
.\run_ghdl.ps1
```

The first run compiles UVVM libraries into `build/uvvm/ghdl`, then compiles and runs this project in `build/work`. Later runs reuse those library artifacts. Use a clean rebuild with:

```powershell
.\run_ghdl.ps1 -Clean
```

The full simulator output is saved to `build/fibonacci_axis_ghdl.log`. Successful runs end after the scoreboard counter report and final UVVM alert counters, with no `ERROR` alerts.

## Run with HDLRegression

With `HDLRegression 1.2.2` installed, run this from the demo directory:

```powershell
python .\run.py
```

The runner compiles only the UVVM libraries needed by this demo and runs `work.fibonacci_axis_tb.func` with GHDL. Its generated files are placed in `hdlregression/`.

## Files

- [src/fibonacci_axis.vhd](src/fibonacci_axis.vhd): synthesizable DUT.
- [tb/fibonacci_axis_tb_pkg.vhd](tb/fibonacci_axis_tb_pkg.vhd): shared generic-scoreboard package.
- [tb/fibonacci_axis_th.vhd](tb/fibonacci_axis_th.vhd): generated-style structural harness and handshake monitor.
- [tb/fibonacci_axis_tb.vhd](tb/fibonacci_axis_tb.vhd): sequencer, VVC commands, register checks, and report output.
- [run_ghdl.ps1](run_ghdl.ps1): reproducible local build and simulation command.
- [run.py](run.py): HDLRegression runner for the same GHDL test.
