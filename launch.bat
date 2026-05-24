@if (@X)==(@Y) @end /*

@echo off
cd /d "%~dp0"
CScript //nologo //E:JScript "%~f0" "%~dp0launch.ps1"
exit /b

*/

var shell = WScript.CreateObject("WScript.Shell");
var psFile = WScript.Arguments(0);
shell.Run(
  "powershell -ExecutionPolicy Bypass -File \"" + psFile + "\"",
  0,      // SW_HIDE — no console window at all
  false   // bWaitOnReturn — don't wait, let it run independently
);
