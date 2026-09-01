const protocolCatalog = [
  { id: "clock_generator", label: "Clock generator", short: "CLK", library: "bitvis_vip_clock_generator", entity: "clock_generator_vvc", detail: "Timing VVC", support: "native" },
  { id: "sbi", label: "SBI", short: "SBI", library: "bitvis_vip_sbi", entity: "sbi_vvc", detail: "Simple bus", support: "native" },
  { id: "uart", label: "UART", short: "UART", library: "bitvis_vip_uart", entity: "uart_vvc", detail: "Serial", support: "native" },
  { id: "avalon_st", label: "Avalon-ST", short: "AST", library: "bitvis_vip_avalon_st", entity: "avalon_st_vvc", detail: "Streaming", support: "guided" },
  { id: "avalon_mm", label: "Avalon-MM", short: "AMM", library: "bitvis_vip_avalon_mm", entity: "avalon_mm_vvc", detail: "Memory mapped", support: "guided" },
  { id: "axi", label: "AXI", short: "AXI", library: "bitvis_vip_axi", entity: "axi_vvc", detail: "AMBA AXI", support: "guided" },
  { id: "axilite", label: "AXI-Lite", short: "AXL", library: "bitvis_vip_axilite", entity: "axilite_vvc", detail: "AMBA AXI-Lite", support: "guided" },
  { id: "axistream", label: "AXI-Stream", short: "AXS", library: "bitvis_vip_axistream", entity: "axistream_vvc", detail: "AMBA stream", support: "native" },
  { id: "gpio", label: "GPIO", short: "GPIO", library: "bitvis_vip_gpio", entity: "gpio_vvc", detail: "Parallel pins", support: "guided" },
  { id: "i2c", label: "I2C", short: "I2C", library: "bitvis_vip_i2c", entity: "i2c_vvc", detail: "Two wire", support: "native" },
  { id: "spi", label: "SPI", short: "SPI", library: "bitvis_vip_spi", entity: "spi_vvc", detail: "Serial peripheral", support: "native" },
  { id: "wishbone", label: "Wishbone", short: "WB", library: "bitvis_vip_wishbone", entity: "wishbone_vvc", detail: "Open bus", support: "guided" },
  { id: "gmii", label: "GMII", short: "GMI", library: "bitvis_vip_gmii", entity: "gmii_vvc", detail: "Ethernet MAC", support: "native" },
  { id: "rgmii", label: "RGMII", short: "RGM", library: "bitvis_vip_rgmii", entity: "rgmii_vvc", detail: "Reduced GMII", support: "native" },
  { id: "ethernet", label: "Ethernet", short: "ETH", library: "bitvis_vip_ethernet", entity: "ethernet_vvc", detail: "Frame layer", support: "guided" },
  { id: "apb", label: "APB", short: "APB", library: "external_vip_apb", entity: "apb_vvc", detail: "External VIP", support: "guided" },
  { id: "assertion", label: "Assertion", short: "AST", library: "uvvm_assertions", entity: "uvvm_assertions_pkg", detail: "Signal property", support: "native" }
];

const assertionCatalog = [
  "assert_value",
  "assert_one_of",
  "assert_one_hot",
  "assert_value_in_range",
  "assert_shift_one_from_left",
  "assert_value_from_min_to_max_cycles_after_trigger",
  "assert_change_to_value_from_min_to_max_cycles_after_trigger",
  "assert_change_from_min_to_max_cycles_after_trigger",
  "assert_stable_from_min_to_max_cycles_after_trigger",
  "assert_value_from_start_to_end_trigger",
  "assert_change_to_value_from_start_to_end_trigger",
  "assert_change_from_start_to_end_trigger",
  "assert_stable_from_start_to_end_trigger"
];

const vipColors = ["amber", "blue", "green", "purple", "coral"];

const defaultState = {
  projectName: "uart_bridge_tb",
  dutEntity: "your_dut",
  dutLibrary: "work",
  clockPeriod: "10",
  clockHighTime: "5",
  watchdogTimeout: "1",
  includeClock: true,
  includeReset: true,
  includeActivityWatchdog: true,
  includeScoreboard: true,
  selected: [
    { id: "clock_generator", index: 1, placement: "th" },
    { id: "uart", index: 1, placement: "over" }
  ]
};

let state = structuredClone(defaultState);
let activeFile = "tb";
let codeTheme = "dark";
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const protocolById = (id) => protocolCatalog.find((protocol) => protocol.id === id);
const identifier = (value, fallback = "uvvm_tb") => {
  const clean = String(value || "").trim().replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
  return (clean || fallback).replace(/^[^a-zA-Z]+/, "_");
};
const projectIdentifier = () => identifier(state.projectName).toLowerCase();
const projectLabel = () => identifier(state.projectName).toUpperCase();
const selectedInstances = (id) => state.selected.filter((item) => item.id === id);
const hasProtocol = (id) => state.selected.some((item) => item.id === id);
const hasClock = () => state.includeClock && hasProtocol("clock_generator");
const timeValue = (value, unit) => `${String(value || "0").trim() || "0"} ${unit}`;
const vvcType = (id) => `${identifier(id).toUpperCase()}_VVCT`;
const instanceConstant = (item) => `${identifier(item.id).toUpperCase()}_${item.index}_VVC`;
const selectedActiveCount = () => state.selected.filter((item) => item.id !== "assertion" && (item.id !== "clock_generator" || hasClock())).length;
const streamRole = (item) => item.role === "sink" ? "sink" : "source";
const vipColor = (item) => vipColors.includes(item.color) ? item.color : "amber";
const placementNames = ["left", "right", "over", "under", "th", "tb"];
const placementForLegacyItem = (item) => {
  if (placementNames.includes(item.placement)) return item.placement;
  if (item.id === "clock_generator") return "th";
  if (item.id === "axistream") return streamRole(item) === "sink" ? "right" : "left";
  return "over";
};
const normalizeSelected = (items) => items.map((item) => ({ ...item, placement: placementForLegacyItem(item), color: vipColor(item), assertion: item.id === "assertion" ? item.assertion || assertionCatalog[0] : item.assertion }));

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function renderProtocolPicker() {
  const list = $("#protocol-list");
  list.innerHTML = protocolCatalog.map((protocol) => {
    const selected = hasProtocol(protocol.id);
    const supportLabel = protocol.support === "native" ? "ready" : "guided TODOs";
    return `<button class="protocol-option${selected ? " selected" : ""}" data-add-protocol="${protocol.id}" data-protocol-drag="${protocol.id}" draggable="true" title="Drag ${protocol.label} to a + in the layout">
      <span class="protocol-symbol">${protocol.short}</span><span class="protocol-name">${protocol.label}<small>${protocol.detail} / ${supportLabel}</small></span>
    </button>`;
  }).join("");
  requestAnimationFrame(() => requestAnimationFrame(updateProtocolScrollIndicator));
}

function updateProtocolScrollIndicator() {
  const picker = $(".protocol-picker");
  const list = $("#protocol-list");
  picker.classList.toggle("has-more-vips", list.scrollHeight > list.clientHeight + 1);
}

function addProtocol(id, placement = "th") {
  const indexes = selectedInstances(id).map((item) => Number(item.index) || 0);
  const nextIndex = indexes.length ? Math.max(...indexes) + 1 : 1;
  state.selected.push({ id, index: id === "assertion" ? 1 : nextIndex, placement, color: "amber", role: id === "axistream" ? "source" : undefined, assertion: id === "assertion" ? assertionCatalog[0] : undefined });
}

function renderArchitectureMap() {
  const map = $("#architecture-map");
  const active = state.selected.filter((item) => item.id !== "clock_generator" || hasClock());
  const placed = (placement) => active.filter((item) => item.placement === placement);
  const vvcNode = (item, position) => {
    const protocol = protocolById(item.id);
    const itemPosition = state.selected.indexOf(item);
    const roleControl = item.id === "axistream" ? `<select data-role-position="${itemPosition}" aria-label="${protocol.label} role"><option value="source"${streamRole(item) === "source" ? " selected" : ""}>Source</option><option value="sink"${streamRole(item) === "sink" ? " selected" : ""}>Sink</option></select>` : "";
    const assertionControl = item.id === "assertion" ? `<select class="assertion-select" data-assertion-position="${itemPosition}" aria-label="Assertion type">${assertionCatalog.map((name) => `<option value="${name}"${(item.assertion || assertionCatalog[0]) === name ? " selected" : ""}>${name.replace("assert_", "")}</option>`).join("")}</select>` : "";
    const instanceControl = item.id === "assertion" ? "" : `<label><span>#</span><select data-index-position="${itemPosition}" aria-label="${protocol.label} VVC instance index">${Array.from({ length: 99 }, (_, index) => `<option value="${index + 1}"${Number(item.index) === index + 1 ? " selected" : ""}>${index + 1}</option>`).join("")}</select></label>`;
    return `<div class="topology-vvc vip-color-${vipColor(item)} ${position}" draggable="true" data-vvc-position="${itemPosition}" title="Drag to another + to move this VVC">
      <strong>${protocol.label} VVC</strong>
      <button class="remove-button" data-remove-position="${itemPosition}" title="Remove ${protocol.label} VVC" aria-label="Remove ${protocol.label} VVC">&times;</button>
      <div class="vvc-controls">${roleControl}${assertionControl}${instanceControl}</div>
    </div>`;
  };
  const dropZone = (placement, label) => `<div class="drop-zone drop-zone-${placement}" data-drop-zone="${placement}"><span class="drop-label">${label}</span><div class="placed-vvcs">${placed(placement).map((item) => vvcNode(item, placement)).join("")}</div><span class="drop-plus" title="Drag a VIP here" aria-label="Drag a VIP here">+</span></div>`;

  map.innerHTML = `<div class="tb-frame">
    <span class="frame-label tb-label">TESTBENCH</span>
    <div class="tb-side"><div class="sequencer-node"><strong>Test case<br>sequencer</strong><small>VVC commands</small></div>${dropZone("tb", "TB free")}</div>
    <div class="sequencer-link"></div>
    <div class="th-frame">
      <span class="frame-label th-label">TEST HARNESS</span>
      <div class="control-lane">${dropZone("over", "SW Interface")}</div>
      <div class="th-free-lane">${dropZone("th", "TH free")}</div>
      <div class="th-core">
        <div class="vvc-lane source-lane">${dropZone("left", "Input")}</div>
        <div class="dut-node"><strong>${identifier(state.dutEntity, "YOUR_DUT")}</strong><small>${identifier(state.dutLibrary, "work")}.library</small></div>
        <div class="vvc-lane sink-lane">${dropZone("right", "Output")}</div>
      </div>
      <div class="clock-lane">${dropZone("under", "Supplementary")}</div>
      <div class="engine-tag">UVVM engine</div>
    </div>
  </div>`;
}

function refreshForm() {
  $("#project-name").value = state.projectName;
  $("#dut-entity").value = state.dutEntity;
  $("#dut-library").value = state.dutLibrary;
  $("#clock-period").value = state.clockPeriod;
  $("#clock-high-time").value = state.clockHighTime;
  $("#watchdog-timeout").value = state.watchdogTimeout;
  $("#include-clock").checked = state.includeClock;
  $("#include-reset").checked = state.includeReset;
  $("#include-activity-watchdog").checked = state.includeActivityWatchdog;
  $("#include-scoreboard").checked = state.includeScoreboard;
  renderProtocolPicker();
  renderArchitectureMap();
  updatePreview();
}

function commonImports() {
  const lines = [
    "library IEEE;",
    "use IEEE.std_logic_1164.all;",
    "use IEEE.numeric_std.all;",
    "",
    "library uvvm_util;",
    "context uvvm_util.uvvm_util_context;",
    "",
    "library uvvm_vvc_framework;",
    "use uvvm_vvc_framework.ti_vvc_framework_support_pkg.all;"
  ];
  const imports = [...new Set(state.selected.map((item) => item.id))]
    .filter((id) => !(id === "clock_generator" && !hasClock()))
    .map((id) => protocolById(id).library);
  imports.forEach((library) => {
    if (library === "uvvm_assertions") lines.push("", "library uvvm_assertions;", "use uvvm_assertions.uvvm_assertions_pkg.all;");
    else lines.push("", `library ${library};`, `context ${library}.vvc_context;`);
  });
  if (state.includeScoreboard) {
    lines.push("", "library bitvis_vip_scoreboard;", "use bitvis_vip_scoreboard.generic_sb_support_pkg.all;");
  }
  return lines.join("\n");
}

function watchdogBlock() {
  return `  constant C_GENERAL_WATCHDOG_TIMEOUT : time := ${timeValue(state.watchdogTimeout, "ms")};
  signal watchdog_ctrl_terminate : t_watchdog_ctrl := C_WATCHDOG_CTRL_DEFAULT;

  watchdog_timer(watchdog_ctrl_terminate, C_GENERAL_WATCHDOG_TIMEOUT, ERROR, "General watchdog");`;
}

function buildTb() {
  const name = projectIdentifier();
  const thName = `${name}_th`;
  const clockStart = hasClock() ? `
    -- Start the clock VVC before the first transaction.
    start_clock(CLOCK_GENERATOR_VVCT, 1, "Start clock");` : "";
  const vvcCalls = state.selected.filter((item) => !["clock_generator", "assertion"].includes(item.id)).map((item) => {
    const protocol = protocolById(item.id);
    return `    -- TODO: Add ${protocol.label} transactions using ${vvcType(item.id)}, instance ${item.index}.`;
  }).join("\n");
  const modelNote = state.includeScoreboard ? "    -- TODO: Add scoreboard expectations and checks in the model or test procedure." : "    -- Scoreboard hooks are disabled for this starter.";
  return `${commonImports()}

-- Generated by UVVM TB Scaffold. Review every TODO before compiling.
entity ${name}_tb is
end entity ${name}_tb;

architecture func of ${name}_tb is
  constant C_SCOPE : string := C_TB_SCOPE_DEFAULT;
  constant C_CLK_PERIOD : time := ${timeValue(state.clockPeriod, "ns")};
  constant C_CLK_HIGH_TIME : time := ${timeValue(state.clockHighTime, "ns")};
${watchdogBlock()}

begin
  ${thName}_instance : entity work.${thName}
    generic map(
      GC_CLK_PERIOD                => C_CLK_PERIOD,
      GC_CLK_HIGH_TIME             => C_CLK_HIGH_TIME,
      GC_ACTIVITY_WATCHDOG_TIMEOUT => ${timeValue(state.watchdogTimeout, "ms")}
    );

  p_sequencer : process
  begin
    await_uvvm_initialization(VOID);
    log(ID_LOG_HDR, "${projectLabel()} smoke test", C_SCOPE);${clockStart}

    -- TODO: Replace this smoke test with protocol transactions for your DUT.
${vvcCalls || "    -- TODO: Add VVC transactions here."}
${modelNote}

    await_uvvm_completion(10 * C_CLK_PERIOD);
    report_alert_counters(FINAL);
    std.env.stop;
    wait;
  end process p_sequencer;
end architecture func;
`;
}

function signalDeclarations() {
  const lines = ["  signal clk : std_logic := '0';"];
  if (state.includeReset) lines.push("  signal arst : std_logic := '0';");
  state.selected.forEach((item) => {
    const suffix = `_${item.index}`;
    if (item.id === "uart") {
      lines.push(`  signal uart_${item.index}_rx : std_logic := '1';`);
      lines.push(`  signal uart_${item.index}_tx : std_logic := '1';`);
    }
    if (item.id === "sbi") {
      lines.push(`  signal sbi${suffix}_cs    : std_logic;`);
      lines.push(`  signal sbi${suffix}_addr  : unsigned(2 downto 0);`);
      lines.push(`  signal sbi${suffix}_wr    : std_logic;`);
      lines.push(`  signal sbi${suffix}_rd    : std_logic;`);
      lines.push(`  signal sbi${suffix}_wdata : std_logic_vector(7 downto 0);`);
      lines.push(`  signal sbi${suffix}_rdata : std_logic_vector(7 downto 0);`);
      lines.push(`  signal sbi${suffix}_ready : std_logic := '1';`);
    }
    if (item.id === "axistream") {
      lines.push(`  signal axistream_${item.index}_if : t_axistream_if(tdata(7 downto 0), tkeep(0 downto 0), tuser(0 downto 0), tstrb(0 downto 0), tid(0 downto 0), tdest(0 downto 0));`);
    }
    if (item.id === "i2c") {
      lines.push(`  signal i2c_${item.index}_if : t_i2c_if := init_i2c_if_signals(VOID);`);
    }
    if (item.id === "spi") {
      lines.push(`  signal spi_${item.index}_if : t_spi_if := init_spi_if_signals(C_SPI_BFM_CONFIG_DEFAULT, true);`);
    }
    if (item.id === "gmii") {
      lines.push(`  signal gmii_${item.index}_tx_if : t_gmii_tx_if;`);
      lines.push(`  signal gmii_${item.index}_rx_if : t_gmii_rx_if;`);
    }
    if (item.id === "rgmii") {
      lines.push(`  signal rgmii_${item.index}_tx_if : t_rgmii_tx_if;`);
      lines.push(`  signal rgmii_${item.index}_rx_if : t_rgmii_rx_if;`);
    }
    if (!["clock_generator", "uart", "sbi", "axistream", "i2c", "spi", "gmii", "rgmii", "assertion"].includes(item.id)) {
      lines.push(`  -- TODO: Declare ${protocolById(item.id).label} interface signals for instance ${item.index}.`);
    }
  });
  return lines.join("\n");
}

function clockInstance(item) {
  return `  i${item.index}_clock_generator_vvc : entity bitvis_vip_clock_generator.clock_generator_vvc
    generic map(
      GC_INSTANCE_IDX      => ${item.index},
      GC_CLOCK_NAME        => "clk",
      GC_CLOCK_PERIOD      => GC_CLK_PERIOD,
      GC_CLOCK_HIGH_TIME   => GC_CLK_HIGH_TIME
    )
    port map(
      clk => clk
    );`;
}

function uartInstance(item) {
  return `  i${item.index}_uart_vvc : entity bitvis_vip_uart.uart_vvc
    generic map(
      GC_INSTANCE_IDX => ${item.index}
    )
    port map(
      uart_vvc_rx => uart_${item.index}_rx,
      uart_vvc_tx => uart_${item.index}_tx
    );`;
}

function sbiInstance(item) {
  const suffix = `_${item.index}`;
  return `  i${item.index}_sbi_vvc : entity bitvis_vip_sbi.sbi_vvc
    generic map(
      GC_ADDR_WIDTH   => 3,
      GC_DATA_WIDTH   => 8,
      GC_INSTANCE_IDX => ${item.index}
    )
    port map(
      clk                     => clk,
      sbi_vvc_master_if.cs    => sbi${suffix}_cs,
      sbi_vvc_master_if.rena  => sbi${suffix}_rd,
      sbi_vvc_master_if.wena  => sbi${suffix}_wr,
      sbi_vvc_master_if.addr  => sbi${suffix}_addr,
      sbi_vvc_master_if.wdata => sbi${suffix}_wdata,
      sbi_vvc_master_if.ready => sbi${suffix}_ready,
      sbi_vvc_master_if.rdata => sbi${suffix}_rdata
    );`;
}

function axistreamInstance(item) {
  const isSource = streamRole(item) === "source";
  return `  i${item.index}_axistream_${streamRole(item)}_vvc : entity bitvis_vip_axistream.axistream_vvc
    generic map(
      -- ${isSource ? "Source VVC drives data into the DUT." : "Sink VVC receives data from the DUT."}
      GC_VVC_IS_MASTER => ${isSource},
      GC_DATA_WIDTH    => 8,
      GC_USER_WIDTH    => 1,
      GC_ID_WIDTH      => 1,
      GC_DEST_WIDTH    => 1,
      GC_INSTANCE_IDX  => ${item.index}
    )
    port map(
      clk              => clk,
      axistream_vvc_if => axistream_${item.index}_if
    );`;
}

function i2cInstance(item) {
  return `  i${item.index}_i2c_vvc : entity bitvis_vip_i2c.i2c_vvc
    generic map(
      GC_INSTANCE_IDX => ${item.index},
      GC_MASTER_MODE  => true
    )
    port map(
      i2c_vvc_if => i2c_${item.index}_if
    );`;
}

function spiInstance(item) {
  return `  i${item.index}_spi_vvc : entity bitvis_vip_spi.spi_vvc
    generic map(
      GC_DATA_WIDTH   => 8,
      GC_INSTANCE_IDX => ${item.index},
      GC_MASTER_MODE  => true
    )
    port map(
      spi_vvc_if => spi_${item.index}_if
    );`;
}

function gmiiInstance(item) {
  return `  i${item.index}_gmii_vvc : entity bitvis_vip_gmii.gmii_vvc
    generic map(
      GC_INSTANCE_IDX => ${item.index}
    )
    port map(
      gmii_vvc_tx_if => gmii_${item.index}_tx_if,
      gmii_vvc_rx_if => gmii_${item.index}_rx_if
    );`;
}

function rgmiiInstance(item) {
  return `  i${item.index}_rgmii_vvc : entity bitvis_vip_rgmii.rgmii_vvc
    generic map(
      GC_INSTANCE_IDX => ${item.index}
    )
    port map(
      rgmii_vvc_tx_if => rgmii_${item.index}_tx_if,
      rgmii_vvc_rx_if => rgmii_${item.index}_rx_if
    );`;
}

function guidedInstance(item) {
  const protocol = protocolById(item.id);
  return `  -- TODO: Complete this ${protocol.label} VVC using the VIP implementation guide.
  -- i${item.index}_${item.id}_vvc : entity ${protocol.library}.${protocol.entity}
  --   generic map(GC_INSTANCE_IDX => ${item.index})
  --   port map(
  --     -- TODO: Add the protocol interface signals and clock.
  --   );`;
}

function assertionHook(item) {
  const assertion = item.assertion || assertionCatalog[0];
  return `  -- TODO: Connect signals and complete the UVVM Assertion.
  -- ${assertion}(
  --   clk           => clk,
  --   ena           => '1',
  --   -- TODO: Map assertion-specific tracked value, limits/triggers, and message.
  -- );`;
}

function vvcInstances() {
  return activeVipItems().map(vipGeneratedBlock).join("\n\n");
}

function activeVipItems() {
  return state.selected.filter((item) => !(item.id === "clock_generator" && !hasClock()));
}

function vipBlocksFor(...placements) {
  const labels = { th: "TH FREE", over: "SW INTERFACE", left: "INPUT", right: "OUTPUT", under: "SUPPLEMENTARY", tb: "TB FREE" };
  return placements.flatMap((placement) => {
    const blocks = activeVipItems().filter((item) => item.placement === placement).map(vipGeneratedBlock);
    return blocks.length ? [`  -----------------------------------------------------------------------------\n  -- ${labels[placement]}\n  -----------------------------------------------------------------------------\n${blocks.join("\n\n")}`] : [];
  }).join("\n\n");
}

function vipGeneratedBlock(item) {
  if (item.id === "clock_generator") return clockInstance(item);
  if (item.id === "uart") return uartInstance(item);
  if (item.id === "sbi") return sbiInstance(item);
  if (item.id === "axistream") return axistreamInstance(item);
  if (item.id === "i2c") return i2cInstance(item);
  if (item.id === "spi") return spiInstance(item);
  if (item.id === "gmii") return gmiiInstance(item);
  if (item.id === "rgmii") return rgmiiInstance(item);
  if (item.id === "assertion") return assertionHook(item);
  return guidedInstance(item);
}

function dutBlock() {
  const dutLibrary = identifier(state.dutLibrary, "work");
  const dutEntity = identifier(state.dutEntity, "your_dut");
  return `  -----------------------------------------------------------------------------
  -- DUT boundary
  -- Declare and connect your RTL ports here. The VVC signals above are ready
  -- for the native clock, UART, SBI, AXI-Stream, I2C, SPI, GMII, and RGMII templates.
  -----------------------------------------------------------------------------
  -- TODO: Uncomment and complete this instantiation for ${dutLibrary}.${dutEntity}.
  -- i_dut : entity ${dutLibrary}.${dutEntity}
  --   port map(
  --     -- TODO: Map DUT ports to clock, reset, and VVC interface signals.
  --   );`;
}

function resetBlock() {
  if (!state.includeReset) return "";
  return `
  p_reset : process
  begin
    -- TODO: Confirm reset polarity and release timing for your DUT.
    arst <= '0';
    wait for 2 * GC_CLK_PERIOD;
    arst <= '1';
    wait;
  end process p_reset;
`;
}

function modelBlock() {
  if (!state.includeScoreboard) return "  -- Scoreboard hooks disabled in project settings.";
  return `  -----------------------------------------------------------------------------
  -- Model / scoreboard hook
  -----------------------------------------------------------------------------
  -- TODO: Subscribe to transaction-info triggers for selected VVCs and add
  -- expected values to a scoreboard. Keep protocol policy in the testbench.
  -- p_model : process
  -- begin
  --   wait;
  -- end process p_model;`;
}

function buildTh() {
  const name = projectIdentifier();
  const beforeDut = vipBlocksFor("th", "over", "left");
  const afterDut = vipBlocksFor("right", "under", "tb");
  const watchdog = state.includeActivityWatchdog ? `
  p_activity_watchdog : activity_watchdog(
    timeout     => GC_ACTIVITY_WATCHDOG_TIMEOUT,
    num_exp_vvc => ${Math.max(1, selectedActiveCount())}
  );
` : "";
  return `${commonImports()}

-- Generated by UVVM TB Scaffold. Review every TODO before compiling.
entity ${name}_th is
  generic(
    GC_CLK_PERIOD                : time := ${timeValue(state.clockPeriod, "ns")};
    GC_CLK_HIGH_TIME             : time := ${timeValue(state.clockHighTime, "ns")};
    GC_ACTIVITY_WATCHDOG_TIMEOUT : time := ${timeValue(state.watchdogTimeout, "ms")}
  );
end entity ${name}_th;

architecture struct of ${name}_th is
${signalDeclarations()}
begin
  i_ti_uvvm_engine : entity uvvm_vvc_framework.ti_uvvm_engine;
${resetBlock()}
${beforeDut || "  -- TODO: Add one or more VVC instances from the UVVM VIP libraries."}
${dutBlock()}
${afterDut}
${watchdog}
${modelBlock()}
end architecture struct;
`;
}

function updatePreview() {
  const text = activeFile === "tb" ? buildTb() : buildTh();
  $("#code-preview").innerHTML = highlightGeneratedCode(text);
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function highlightGeneratedCode(text) {
  let output = escapeHtml(text);
  const markers = [];
  if (activeFile === "th") {
    activeVipItems().forEach((item, index) => {
      const snippet = escapeHtml(vipGeneratedBlock(item));
      const marker = `__VIP_BLOCK_${index}__`;
      if (!output.includes(snippet)) return;
      output = output.replace(snippet, marker);
      markers.push({ marker, snippet: highlightVipBlock(snippet, vipColor(item)), color: vipColor(item) });
    });
  }
  output = output
    .replace(/(--.*)$/gm, '<span class="code-comment">$1</span>')
    .replace(/\bp_sequencer\b/g, '<span class="code-sequencer">p_sequencer</span>')
    .replace(/(&quot;.*?&quot;)/g, '<span class="code-string">$1</span>');
  markers.forEach(({ marker, snippet, color }) => {
    output = output.replace(marker, `<span class="code-vip vip-color-${color}">${snippet}</span>`);
  });
  return output;
}

function highlightVipBlock(snippet, color) {
  return snippet.split("\n").map((line) => {
    if (/^\s*--/.test(line)) return `<span class="code-comment">${line}</span>`;
    if (/^\s*i\d+_[a-z0-9_]+\s*:\s*entity\s+/i.test(line)) return `<span class="code-vip-declaration vip-color-${color}">${line}</span>`;
    return line;
  }).join("\n");
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBundle() {
  const base = projectIdentifier();
  downloadText(`${base}_tb.vhd`, buildTb());
  setTimeout(() => downloadText(`${base}_th.vhd`, buildTh()), 120);
  setTimeout(() => downloadText(`${base}.uvvm-tb-scaffold.json`, JSON.stringify(state, null, 2)), 240);
  showToast("TB, TH, and project JSON exported");
}

function saveProject() {
  downloadText(`${projectIdentifier()}.uvvm-tb-scaffold.json`, JSON.stringify(state, null, 2));
  showToast("Project settings saved");
}

function bindInputs() {
  const fields = {
    "project-name": "projectName",
    "dut-entity": "dutEntity",
    "dut-library": "dutLibrary",
    "clock-period": "clockPeriod",
    "clock-high-time": "clockHighTime",
    "watchdog-timeout": "watchdogTimeout"
  };
  Object.entries(fields).forEach(([elementId, stateKey]) => {
    $(`#${elementId}`).addEventListener("input", (event) => {
      state[stateKey] = event.target.value;
      renderArchitectureMap();
      updatePreview();
    });
  });
  ["include-clock", "include-reset", "include-activity-watchdog", "include-scoreboard"].forEach((elementId) => {
    $(`#${elementId}`).addEventListener("change", (event) => {
      const stateKey = elementId.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      state[stateKey] = event.target.checked;
      renderProtocolPicker();
      renderArchitectureMap();
      updatePreview();
    });
  });
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const codeThemeToggle = event.target.closest("#code-theme-toggle");
    if (codeThemeToggle) {
      codeTheme = codeTheme === "dark" ? "light" : "dark";
      $(".preview-panel").classList.toggle("code-theme-light", codeTheme === "light");
      codeThemeToggle.textContent = codeTheme === "dark" ? "Light" : "Dark";
      codeThemeToggle.title = `Switch code preview to ${codeTheme === "dark" ? "light" : "dark"} theme`;
      codeThemeToggle.setAttribute("aria-pressed", String(codeTheme === "light"));
      return;
    }
    const addButton = event.target.closest("[data-add-protocol]");
    if (addButton) {
      addProtocol(addButton.dataset.addProtocol);
      renderProtocolPicker();
      renderArchitectureMap();
      updatePreview();
      return;
    }
    const removeButton = event.target.closest("[data-remove-position]");
    if (removeButton) {
      state.selected.splice(Number(removeButton.dataset.removePosition), 1);
      renderProtocolPicker();
      renderArchitectureMap();
      updatePreview();
      return;
    }
    const tab = event.target.closest("[data-file]");
    if (tab) {
      activeFile = tab.dataset.file;
      document.querySelectorAll(".file-tab").forEach((item) => item.classList.toggle("active", item === tab));
      updatePreview();
      return;
    }
    const scrollButton = event.target.closest("[data-scroll]");
    if (scrollButton) {
      document.getElementById(scrollButton.dataset.scroll).scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".step-link").forEach((item) => item.classList.toggle("active", item === scrollButton));
    }
  });
  document.addEventListener("input", (event) => {
    const indexInput = event.target.closest("[data-index-position]");
    if (!indexInput) return;
    state.selected[Number(indexInput.dataset.indexPosition)].index = Math.max(1, Number(indexInput.value) || 1);
    renderArchitectureMap();
    updatePreview();
  });
  document.addEventListener("change", (event) => {
    const indexInput = event.target.closest("[data-index-position]");
    if (indexInput) {
      state.selected[Number(indexInput.dataset.indexPosition)].index = Math.max(1, Number(indexInput.value) || 1);
      renderArchitectureMap();
      updatePreview();
      return;
    }
    const assertionInput = event.target.closest("[data-assertion-position]");
    if (assertionInput) {
      state.selected[Number(assertionInput.dataset.assertionPosition)].assertion = assertionInput.value;
      renderArchitectureMap();
      updatePreview();
      return;
    }
    const roleInput = event.target.closest("[data-role-position]");
    if (!roleInput) return;
    state.selected[Number(roleInput.dataset.rolePosition)].role = roleInput.value;
    renderArchitectureMap();
    updatePreview();
  });
  document.addEventListener("dragstart", (event) => {
    const color = event.target.closest("[data-vip-color]");
    const protocol = event.target.closest("[data-protocol-drag]");
    const placedVvc = event.target.closest("[data-vvc-position]");
    if (!color && !protocol && !placedVvc) return;
    const payload = color ? { type: "color", color: color.dataset.vipColor } : protocol ? { type: "protocol", id: protocol.dataset.protocolDrag } : { type: "vvc", position: Number(placedVvc.dataset.vvcPosition) };
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData("application/x-uvvm-vvc", JSON.stringify(payload));
  });
  document.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-drop-zone]");
    const card = event.target.closest("[data-vvc-position]");
    if (!zone && !card) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    (card || zone).classList.add("drag-over");
  });
  document.addEventListener("dragleave", (event) => {
    const zone = event.target.closest("[data-drop-zone]");
    if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove("drag-over");
  });
  document.addEventListener("drop", (event) => {
    const card = event.target.closest("[data-vvc-position]");
    const zone = event.target.closest("[data-drop-zone]");
    if (!zone && !card) return;
    event.preventDefault();
    (card || zone).classList.remove("drag-over");
    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/x-uvvm-vvc"));
      if (payload.type === "color" && card && state.selected[Number(card.dataset.vvcPosition)]) state.selected[Number(card.dataset.vvcPosition)].color = payload.color;
      else if (!zone) return;
      if (payload.type === "protocol") addProtocol(payload.id, zone.dataset.dropZone);
      if (payload.type === "vvc" && state.selected[payload.position]) state.selected[payload.position].placement = zone.dataset.dropZone;
      renderProtocolPicker();
      renderArchitectureMap();
      updatePreview();
    } catch {
      showToast("Drag a UVVM VIP from the available list");
    }
  });
  $("#download-tb").addEventListener("click", () => { downloadText(`${projectIdentifier()}_tb.vhd`, buildTb()); showToast("Testbench VHDL downloaded"); });
  $("#download-th").addEventListener("click", () => { downloadText(`${projectIdentifier()}_th.vhd`, buildTh()); showToast("Test harness VHDL downloaded"); });
  $("#download-bundle").addEventListener("click", downloadBundle);
  $("#copy-button").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(activeFile === "tb" ? buildTb() : buildTh());
      showToast(`${activeFile === "tb" ? "Testbench" : "Test harness"} copied to clipboard`);
    } catch {
      showToast("Clipboard unavailable in this browser");
    }
  });
  $("#save-project-button").addEventListener("click", saveProject);
  $("#load-project-button").addEventListener("click", () => $("#project-file-input").click());
  $("#project-file-input").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loaded = JSON.parse(reader.result);
        state = { ...defaultState, ...loaded, selected: normalizeSelected(Array.isArray(loaded.selected) ? loaded.selected : defaultState.selected) };
        refreshForm();
        showToast("Project settings loaded");
      } catch {
        showToast("That file is not a valid TB Scaffold project");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
      event.preventDefault();
      downloadBundle();
    }
  });
  window.addEventListener("resize", updateProtocolScrollIndicator);
}

bindInputs();
bindEvents();
refreshForm();
