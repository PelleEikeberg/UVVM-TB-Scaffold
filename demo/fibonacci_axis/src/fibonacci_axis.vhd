library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;

entity fibonacci_axis is
  port (
    clk : in std_logic;
    arst : in std_logic;

    sbi_cs : in std_logic;
    sbi_addr : in unsigned(2 downto 0);
    sbi_wena : in std_logic;
    sbi_rena : in std_logic;
    sbi_wdata : in std_logic_vector(7 downto 0);
    sbi_ready : out std_logic;
    sbi_rdata : out std_logic_vector(7 downto 0);

    s_axis_tready : out std_logic;
    s_axis_tvalid : in std_logic;
    s_axis_tdata : in std_logic_vector(7 downto 0);
    s_axis_tuser : in std_logic_vector(0 downto 0);
    s_axis_tkeep : in std_logic_vector(0 downto 0);
    s_axis_tlast : in std_logic;

    m_axis_tready : in std_logic;
    m_axis_tvalid : out std_logic;
    m_axis_tdata : out std_logic_vector(7 downto 0);
    m_axis_tuser : out std_logic_vector(0 downto 0);
    m_axis_tkeep : out std_logic_vector(0 downto 0);
    m_axis_tlast : out std_logic
  );
end entity fibonacci_axis;

architecture rtl of fibonacci_axis is
  signal enabled : std_logic := '0';
  signal output_valid : std_logic := '0';
  signal output_data : std_logic_vector(7 downto 0) := (others => '0');
  signal output_user : std_logic_vector(0 downto 0) := (others => '0');
  signal output_keep : std_logic_vector(0 downto 0) := (others => '0');
  signal output_last : std_logic := '0';
  signal accepted_count : unsigned(7 downto 0) := (others => '0');
  signal last_result : std_logic_vector(7 downto 0) := (others => '0');

  function fibonacci(value : std_logic_vector(7 downto 0)) return std_logic_vector is
    variable previous : natural := 0;
    variable current : natural := 1;
    variable next_value : natural;
    variable index : natural := to_integer(unsigned(value));
  begin
    for position in 1 to index loop
      next_value := (previous + current) mod 256;
      previous := current;
      current := next_value;
    end loop;
    return std_logic_vector(to_unsigned(previous, 8));
  end function fibonacci;
begin
  sbi_ready <= '1';
  sbi_rdata <= enabled & "0000000" when sbi_addr = "000" else
               std_logic_vector(accepted_count) when sbi_addr = "001" else
               last_result when sbi_addr = "010" else
               (others => '0');

  s_axis_tready <= enabled and (not output_valid or m_axis_tready);
  m_axis_tvalid <= output_valid;
  m_axis_tdata <= output_data;
  m_axis_tuser <= output_user;
  m_axis_tkeep <= output_keep;
  m_axis_tlast <= output_last;

  p_dut : process(clk)
  begin
    if rising_edge(clk) then
      if arst = '1' then
        enabled <= '0';
        output_valid <= '0';
        output_data <= (others => '0');
        output_user <= (others => '0');
        output_keep <= (others => '0');
        output_last <= '0';
        accepted_count <= (others => '0');
        last_result <= (others => '0');
      else
        if sbi_cs = '1' and sbi_wena = '1' and sbi_addr = "000" then
          enabled <= sbi_wdata(0);
          if sbi_wdata(1) = '1' then
            accepted_count <= (others => '0');
          end if;
        end if;

        if s_axis_tvalid = '1' and s_axis_tready = '1' then
          output_data <= fibonacci(s_axis_tdata);
          output_user <= s_axis_tuser;
          output_keep <= s_axis_tkeep;
          output_last <= s_axis_tlast;
          output_valid <= '1';
          accepted_count <= accepted_count + 1;
          last_result <= fibonacci(s_axis_tdata);
        elsif output_valid = '1' and m_axis_tready = '1' then
          output_valid <= '0';
        end if;
      end if;
    end if;
  end process p_dut;
end architecture rtl;
