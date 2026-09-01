library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;

library uvvm_util;
context uvvm_util.uvvm_util_context;

library bitvis_vip_scoreboard;

package fibonacci_axis_tb_pkg is
  package stream_sb_pkg is new bitvis_vip_scoreboard.generic_sb_pkg
    generic map (
      t_element => std_logic_vector(7 downto 0),
      element_match => std_match,
      to_string_element => to_string
    );

  shared variable stream_sb : stream_sb_pkg.t_generic_sb;
end package fibonacci_axis_tb_pkg;
