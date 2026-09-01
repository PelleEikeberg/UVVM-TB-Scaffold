# UVVM TB Scaffold

A dependency-free browser tool for starting a UVVM testbench (`*_tb.vhd`) and structural test harness (`*_th.vhd`) from a visual VVC layout. It accelerates repeatable framework setup without pretending to know a project's DUT ports, bus widths, reset policy, or test intent.

## Start locally

Open [index.html](index.html) in a browser. The app has no build step, backend, or runtime dependency. A static server is optional:

```powershell
python -m http.server 8080 --directory uvvm_tb_scaffold
```

Then open <http://localhost:8080>. To explore a complete configuration, load [fibonacci_axis.uvvm-tb-scaffold.json](demo/fibonacci_axis/fibonacci_axis.uvvm-tb-scaffold.json).

## What the layout controls

- Project and DUT identifiers, clock timing, and watchdog timeout.
- Drag-and-drop VVC placement in TH Free, SW Interface, Input, Output, Supplementary, or TB Free. The harness follows that order around the DUT.
- Per-VVC instance indices, AXI-Stream source/sink role, and five visual colors. Colors are saved with the project and make the matching preview block easy to find.
- Optional clock generator, reset scaffold, activity watchdog, and scoreboard/model hook.
- JSON export/import, independent TB/TH downloads, complete bundles, clipboard copy, and light/dark code-preview modes.

The initial example puts the clock-generator VVC in TH Free and the UART VVC at SW Interface. Imported projects without a placement normalize their clock VVC to TH Free as well.

## Generated VHDL

The testbench contains UVVM imports, the harness instantiation, a general watchdog, UVVM initialization, a `p_sequencer` process, optional clock start, transaction TODOs, completion, and final alert reporting. The harness contains the UVVM engine, selected contexts and signals, VVC blocks ordered from the layout, a visible DUT boundary, and optional reset/watchdog/scoreboard scaffolding.

Native templates emit a documented VVC instance and a conservative starter interface. They still require a DUT port map and design-level transactions.

| VIP | Generator output |
| --- | --- |
| Clock Generator | `clk` signal and clock-generator VVC |
| UART | RX/TX signals and UART VVC |
| SBI | 3-bit address and 8-bit data starter bus |
| AXI-Stream | 8-bit starter record; source or sink role |
| I2C | Initialized two-wire record; master mode |
| SPI | Initialized four-wire record; 8-bit master mode |
| GMII | Fixed-width TX/RX record pair |
| RGMII | Fixed-width TX/RX record pair |

GPIO, Wishbone, Avalon-MM, Avalon-ST, AXI-Lite, AXI4, APB, and Ethernet intentionally generate guided TODO blocks. Their widths, optional sidebands, or physical-layer binding must agree with the target design. Ethernet is an HVVC and must be paired with a chosen physical VVC such as GMII or RGMII. The Assertion item imports the assertion package and creates a concurrent-call hook; monitored values, trigger conditions, and limits remain design-specific.

## Recommended workflow

1. Name the project and identify the intended DUT library/entity.
2. Build the VVC topology, select instance numbers, and choose AXI-Stream directions.
3. Keep or remove the scaffolds the project needs.
4. Review both previews, especially the color-marked VVC blocks and every `TODO`.
5. Export the files and JSON profile.
6. Complete the DUT port map, protocol configuration, transactions, reset policy, and model behavior before compiling.

The generator never fills in the last step automatically. That is deliberate: a visibly incomplete port map is safer than VHDL that compiles while validating the wrong interface.

## Demo and customization

[demo/fibonacci_axis](demo/fibonacci_axis) is a runnable Fibonacci AXI-Stream/SBI project built from this workflow. Its profile demonstrates a clock in TH Free, SBI at SW Interface, AXI-Stream source at Input, and AXI-Stream sink at Output. The demo adds the project-specific DUT mapping, reset behavior, scoreboard monitor, and transactions, then validates them with GHDL and HDLRegression when a local UVVM checkout is available.

For visual tuning, edit the `QUICK CUSTOMIZATION` block near the end of [styles.css](styles.css). It collects page, text, accent, VVC-color, topology-height, and typography tokens. The static **Why this tool** copy in [index.html](index.html) is ordinary page content only; it is not written into generated VHDL.

## Repository layout

- [index.html](index.html), [app.js](app.js), and [styles.css](styles.css) are the static site and can be published directly with GitHub Pages.
- [demo/fibonacci_axis](demo/fibonacci_axis) contains the DUT, generated-style VHDL pair, saved scaffold profile, and local simulator runners.
- The full UVVM source tree is intentionally not bundled here. The demo runners accept `UVVM_ROOT` or use a sibling `UVVM` directory for local simulation.

## GitHub Pages

This repository is designed to deploy as a static site. Publish the repository root with GitHub Pages; no server-side processing is required. The browser performs layout, VHDL generation, JSON import/export, and downloads locally. The demo is available in the repository for inspection and local simulation, but is not needed by the hosted app.
