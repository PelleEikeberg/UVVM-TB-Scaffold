library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;

library uvvm_util;
context uvvm_util.uvvm_util_context;

library uvvm_vvc_framework;
use uvvm_vvc_framework.ti_vvc_framework_support_pkg.all;

library bitvis_vip_sbi;
context bitvis_vip_sbi.vvc_context;

library bitvis_vip_axistream;
context bitvis_vip_axistream.vvc_context;

library bitvis_vip_clock_generator;
context bitvis_vip_clock_generator.vvc_context;

use work.fibonacci_axis_tb_pkg.all;

entity fibonacci_axis_th is
end entity fibonacci_axis_th;

architecture struct of fibonacci_axis_th is
  constant C_DATA_WIDTH : positive := 8;
  constant C_USER_WIDTH : positive := 1;
  constant C_ID_WIDTH : positive := 1;
  constant C_DEST_WIDTH : positive := 1;

  signal clk : std_logic := '0';
  signal arst : std_logic := '1';

  signal sbi_if : t_sbi_if(
    addr(2 downto 0),
    wdata(C_DATA_WIDTH - 1 downto 0),
    rdata(C_DATA_WIDTH - 1 downto 0)
  ) := init_sbi_if_signals(addr_width => 3, data_width => C_DATA_WIDTH);

  signal s_axis_if : t_axistream_if(
    tdata(C_DATA_WIDTH - 1 downto 0),
    tkeep((C_DATA_WIDTH / 8) - 1 downto 0),
    tuser(C_USER_WIDTH - 1 downto 0),
    tstrb((C_DATA_WIDTH / 8) - 1 downto 0),
    tid(C_ID_WIDTH - 1 downto 0),
    tdest(C_DEST_WIDTH - 1 downto 0)
  );

  signal m_axis_if : t_axistream_if(
    tdata(C_DATA_WIDTH - 1 downto 0),
    tkeep((C_DATA_WIDTH / 8) - 1 downto 0),
    tuser(C_USER_WIDTH - 1 downto 0),
    tstrb((C_DATA_WIDTH / 8) - 1 downto 0),
    tid(C_ID_WIDTH - 1 downto 0),
    tdest(C_DEST_WIDTH - 1 downto 0)
  );
begin
  i_ti_uvvm_engine : entity uvvm_vvc_framework.ti_uvvm_engine;

  p_reset : process
  begin
    arst <= '1';
    wait for 50 ns;
    arst <= '0';
    wait;
  end process p_reset;

  -----------------------------------------------------------------------------
  -- TH FREE
  -----------------------------------------------------------------------------
  i_clock_generator_vvc : entity bitvis_vip_clock_generator.clock_generator_vvc
    generic map (
      GC_INSTANCE_IDX => 1,
      GC_CLOCK_NAME => "fibonacci_axis_clk",
      GC_CLOCK_PERIOD => 10 ns,
      GC_CLOCK_HIGH_TIME => 5 ns
    )
    port map (
      clk => clk
    );

  -----------------------------------------------------------------------------
  -- SW INTERFACE
  -----------------------------------------------------------------------------
  i_sbi_vvc : entity bitvis_vip_sbi.sbi_vvc
    generic map (
      GC_ADDR_WIDTH => 3,
      GC_DATA_WIDTH => C_DATA_WIDTH,
      GC_INSTANCE_IDX => 1
    )
    port map (
      clk => clk,
      sbi_vvc_master_if => sbi_if
    );

  -----------------------------------------------------------------------------
  -- INPUT
  -----------------------------------------------------------------------------
  i_axis_source_vvc : entity bitvis_vip_axistream.axistream_vvc
    generic map (
      GC_VVC_IS_MASTER => true,
      GC_DATA_WIDTH => C_DATA_WIDTH,
      GC_USER_WIDTH => C_USER_WIDTH,
      GC_ID_WIDTH => C_ID_WIDTH,
      GC_DEST_WIDTH => C_DEST_WIDTH,
      GC_INSTANCE_IDX => 1
    )
    port map (
      clk => clk,
      axistream_vvc_if => s_axis_if
    );

  -----------------------------------------------------------------------------
  -- DUT BOUNDARY
  -----------------------------------------------------------------------------
  i_dut : entity work.fibonacci_axis
    port map (
      clk => clk,
      arst => arst,
      sbi_cs => sbi_if.cs,
      sbi_addr => sbi_if.addr,
      sbi_wena => sbi_if.wena,
      sbi_rena => sbi_if.rena,
      sbi_wdata => sbi_if.wdata,
      sbi_ready => sbi_if.ready,
      sbi_rdata => sbi_if.rdata,
      s_axis_tready => s_axis_if.tready,
      s_axis_tvalid => s_axis_if.tvalid,
      s_axis_tdata => s_axis_if.tdata,
      s_axis_tuser => s_axis_if.tuser,
      s_axis_tkeep => s_axis_if.tkeep,
      s_axis_tlast => s_axis_if.tlast,
      m_axis_tready => m_axis_if.tready,
      m_axis_tvalid => m_axis_if.tvalid,
      m_axis_tdata => m_axis_if.tdata,
      m_axis_tuser => m_axis_if.tuser,
      m_axis_tkeep => m_axis_if.tkeep,
      m_axis_tlast => m_axis_if.tlast
    );

  -----------------------------------------------------------------------------
  -- OUTPUT
  -----------------------------------------------------------------------------
  i_axis_sink_vvc : entity bitvis_vip_axistream.axistream_vvc
    generic map (
      GC_VVC_IS_MASTER => false,
      GC_DATA_WIDTH => C_DATA_WIDTH,
      GC_USER_WIDTH => C_USER_WIDTH,
      GC_ID_WIDTH => C_ID_WIDTH,
      GC_DEST_WIDTH => C_DEST_WIDTH,
      GC_INSTANCE_IDX => 2
    )
    port map (
      clk => clk,
      axistream_vvc_if => m_axis_if
    );

  p_activity_watchdog : activity_watchdog(
    timeout => 50 us,
    num_exp_vvc => 4
  );

  p_scoreboard : process
  begin
    wait until rising_edge(clk);
    if m_axis_if.tvalid = '1' and m_axis_if.tready = '1' then
      stream_sb.check_received(m_axis_if.tdata, "DUT AXI-Stream output");
    end if;
  end process p_scoreboard;
end architecture struct;
