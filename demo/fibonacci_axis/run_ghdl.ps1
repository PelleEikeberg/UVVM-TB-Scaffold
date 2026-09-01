[CmdletBinding()]
param(
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'
$DemoRoot = $PSScriptRoot
$RepositoryRoot = Split-Path -Parent (Split-Path -Parent $DemoRoot)
$UvvmRoot = if ($env:UVVM_ROOT) { $env:UVVM_ROOT } else { Join-Path (Split-Path -Parent $RepositoryRoot) 'UVVM' }
$BuildRoot = Join-Path $DemoRoot 'build'
$UvvmBuildRoot = Join-Path $BuildRoot 'uvvm'
$WorkRoot = Join-Path $BuildRoot 'work'
$GitBash = 'C:\Program Files\Git\bin\bash.exe'

if (-not (Get-Command ghdl -ErrorAction SilentlyContinue)) {
  throw 'GHDL was not found on PATH.'
}
if (-not (Test-Path $GitBash)) {
  throw "Git Bash was not found at $GitBash. It is needed to run the supplied UVVM compiler script."
}
if (-not (Test-Path $UvvmRoot)) {
  throw "UVVM source was not found. Set UVVM_ROOT to a UVVM checkout or place UVVM beside the repository."
}

if ($Clean -and (Test-Path $BuildRoot)) {
  Remove-Item -Recurse -Force $BuildRoot
}
New-Item -ItemType Directory -Force -Path $UvvmBuildRoot, $WorkRoot | Out-Null

$RequiredLibraries = @(
  'uvvm_util-obj08.cf',
  'uvvm_vvc_framework-obj08.cf',
  'bitvis_vip_scoreboard-obj08.cf',
  'bitvis_vip_sbi-obj08.cf',
  'bitvis_vip_axistream-obj08.cf',
  'bitvis_vip_clock_generator-obj08.cf'
)
$UvvmGhdlDirectory = Join-Path $UvvmBuildRoot 'ghdl'
$UvvmAlreadyCompiled = $RequiredLibraries | ForEach-Object { Test-Path (Join-Path $UvvmGhdlDirectory $_) } | Where-Object { -not $_ }

if ($UvvmAlreadyCompiled) {
  Write-Host 'Compiling UVVM libraries for GHDL...'
  $UvvmUnixPath = $UvvmRoot.Replace('\', '/')
  $BuildUnixPath = $UvvmBuildRoot.Replace('\', '/')
  & $GitBash -lc "cd '$UvvmUnixPath/script' && ./compile_all.sh ghdl '$BuildUnixPath'"
  if ($LASTEXITCODE -ne 0) { throw 'UVVM compilation failed.' }
}

Push-Location $WorkRoot
try {
  $GhdlOptions = @('--std=08', '-frelaxed', '-fsynopsys', '-Wno-hide', '-Wno-shared')
  $LibraryOptions = @("-P$UvvmGhdlDirectory")
  $Sources = @(
    (Join-Path $DemoRoot 'src\fibonacci_axis.vhd'),
    (Join-Path $DemoRoot 'tb\fibonacci_axis_tb_pkg.vhd'),
    (Join-Path $DemoRoot 'tb\fibonacci_axis_th.vhd'),
    (Join-Path $DemoRoot 'tb\fibonacci_axis_tb.vhd')
  )

  & ghdl -a @GhdlOptions @LibraryOptions --work=work @Sources
  if ($LASTEXITCODE -ne 0) { throw 'Demo testbench analysis failed.' }

  & ghdl --elab-run @GhdlOptions @LibraryOptions --work=work fibonacci_axis_tb | Tee-Object -FilePath (Join-Path $BuildRoot 'fibonacci_axis_ghdl.log')
  if ($LASTEXITCODE -ne 0) { throw 'Demo simulation failed.' }
}
finally {
  Pop-Location
}

Write-Host "Simulation passed. Transcript: $(Join-Path $BuildRoot 'fibonacci_axis_ghdl.log')"
