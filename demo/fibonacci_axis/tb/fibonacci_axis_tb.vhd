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

library bitvis_vip_scoreboard;
use bitvis_vip_scoreboard.generic_sb_support_pkg.all;

use work.fibonacci_axis_tb_pkg.all;
use work.fibonacci_axis_tb_pkg.stream_sb_pkg.all;

-- hdlregression:tb
entity fibonacci_axis_tb is
end entity fibonacci_axis_tb;

architecture func of fibonacci_axis_tb is
  constant C_SCOPE : string := C_TB_SCOPE_DEFAULT;
  constant C_GENERAL_WATCHDOG_TIMEOUT : time := 100 us;
  signal watchdog_ctrl : t_watchdog_ctrl := C_WATCHDOG_CTRL_DEFAULT;

begin
  i_test_harness : entity work.fibonacci_axis_th;

  watchdog_timer(watchdog_ctrl, C_GENERAL_WATCHDOG_TIMEOUT, ERROR, "Fibonacci axis watchdog");

  p_sequencer : process
    procedure send_and_expect(
      constant input_value : std_logic_vector(7 downto 0);
      constant expected_value : std_logic_vector(7 downto 0);
      constant is_last : boolean := false
    ) is
    begin
      stream_sb.add_expected(expected_value, "Expected Fibonacci result");
      axistream_transmit(AXISTREAM_VVCT, 1, input_value, "Send Fibonacci index " & to_string(input_value, HEX));
      axistream_expect(AXISTREAM_VVCT, 2, expected_value, "Expect Fibonacci result " & to_string(expected_value, HEX));
      await_completion(AXISTREAM_VVCT, 1, 10 us, "Await source completion");
      await_completion(AXISTREAM_VVCT, 2, 10 us, "Await sink completion");
    end procedure send_and_expect;
  begin
    await_uvvm_initialization(VOID);

    disable_log_msg(ALL_MESSAGES);
    enable_log_msg(ID_LOG_HDR);
    enable_log_msg(ID_LOG_HDR_LARGE);
    enable_log_msg(ID_SEQUENCER);
    enable_log_msg(ID_DATA);
    enable_log_msg(AXISTREAM_VVCT, 1, ID_PACKET_INITIATE);
    enable_log_msg(AXISTREAM_VVCT, 2, ID_PACKET_INITIATE);
    enable_log_msg(AXISTREAM_VVCT, 2, ID_PACKET_COMPLETE);

    stream_sb.set_scope("FIBONACCI_STREAM_SCOREBOARD");
    stream_sb.config(C_SB_CONFIG_DEFAULT, "Configure Fibonacci stream scoreboard");
    stream_sb.enable(VOID);
    stream_sb.enable_log_msg(ID_DATA);

    start_clock(CLOCK_GENERATOR_VVCT, 1, "Start test clock");
    wait for 60 ns;

    log(ID_LOG_HDR_LARGE, "FIBONACCI AXI-STREAM + SBI UVVM DEMO", C_SCOPE);

    log(ID_LOG_HDR, "Check reset defaults through SBI", C_SCOPE);
    sbi_check(SBI_VVCT, 1, "000", x"00", "Control register disabled after reset");
    sbi_check(SBI_VVCT, 1, "001", x"00", "Accepted word count is zero after reset");
    await_completion(SBI_VVCT, 1, 10 us, "Await default-register checks");

    log(ID_LOG_HDR, "Enable streaming Fibonacci engine through SBI", C_SCOPE);
    sbi_write(SBI_VVCT, 1, "000", x"01", "Enable Fibonacci processing");
    await_completion(SBI_VVCT, 1, 10 us, "Await control write");

    log(ID_LOG_HDR, "Drive AXI-Stream input and check DUT outputs", C_SCOPE);
    send_and_expect(x"00", x"00");
    send_and_expect(x"01", x"01");
    send_and_expect(x"02", x"01");
    send_and_expect(x"05", x"05");
    send_and_expect(x"08", x"15");
    send_and_expect(x"0A", x"37");

    log(ID_LOG_HDR, "Check SBI status registers after stream traffic", C_SCOPE);
    sbi_check(SBI_VVCT, 1, "001", x"06", "Six stream words accepted");
    sbi_check(SBI_VVCT, 1, "010", x"37", "Last result is Fibonacci(10)");
    await_completion(SBI_VVCT, 1, 10 us, "Await status-register checks");

    check_value(stream_sb.is_empty(VOID), true, ERROR, "All expected Fibonacci results reached scoreboard", C_SCOPE);
    stream_sb.report_counters(VOID);

    await_uvvm_completion(10 us);
    report_alert_counters(FINAL);
    std.env.stop;
    wait;
  end process p_sequencer;

end architecture func;
