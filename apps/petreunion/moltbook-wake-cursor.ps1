# Wake Cursor IDE and send "check moltbook" so the Agent runs the Moltbook check.
# Uses Win32 ShowWindowAsync + SetForegroundWindow (more reliable than AppActivate when window is minimized or buried).
# Keystrokes are "noisy" — if you're typing in another app when this runs, it can interrupt. Schedule when idle.
# When run non-interactively (e.g. Task Scheduler), skips the modal and Cursor wake so the task can exit.

param(
    [string]$Message = "check moltbook",
    [string]$OpenFolder = ""   # e.g. C:\cevict-live — if Cursor not running, start it with this folder
)

$ErrorActionPreference = "Stop"

# Scheduled tasks often run with -NoProfile and no desktop; ShowDialog() would block forever.
$isNonInteractive = -not [Environment]::UserInteractive -or
    ([Environment]::GetCommandLineArgs() | Where-Object { $_ -like '-NonI*' })
if ($isNonInteractive) {
    Write-Host "Non-interactive run (e.g. scheduled task). Skipping Cursor wake and modal; trigger file was already updated."
    exit 0
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic

# Win32: force restore and focus even when minimized or behind other windows
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WindowManager {
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

# Get the Cursor process that has a main window (actual IDE frame). Electron can have many processes; we want the one with MainWindowHandle.
$cursorProc = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1

if (-not $cursorProc) {
    if ($OpenFolder -and (Test-Path $OpenFolder)) {
        Write-Host "Cursor not running. Starting Cursor with folder: $OpenFolder"
        Start-Process "cursor" -ArgumentList "`"$OpenFolder`"" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
        $cursorProc = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    }
    if (-not $cursorProc) {
        Write-Host "Cursor is not running or has no visible window. Start Cursor (or use -OpenFolder to launch it), then run this script again."
        exit 0
    }
}

# 10-second countdown modal so you can step away (e.g. take the dog out) before keys are sent. "Run now" skips the wait; "Cancel" aborts.
Add-Type -AssemblyName System.Windows.Forms
$script:userCancelled = $false
$countdown = 10
$form = New-Object System.Windows.Forms.Form
$form.Text = "Moltbook check"
$form.Size = New-Object System.Drawing.Size(380, 180)
$form.FormBorderStyle = 'FixedDialog'
$form.StartPosition = 'CenterScreen'
$form.Topmost = $true
$label = New-Object System.Windows.Forms.Label
$label.AutoSize = $false
$label.Size = New-Object System.Drawing.Size(340, 55)
$label.Location = New-Object System.Drawing.Point(20, 12)
$label.Text = "Moltbook check is about to run in $countdown seconds.`nGo take the dog out - I will be on Moltbook for a few minutes."
$label.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$form.Controls.Add($label)
$btnRun = New-Object System.Windows.Forms.Button
$btnRun.Text = "Run now"
$btnRun.Size = New-Object System.Drawing.Size(100, 28)
$btnRun.Location = New-Object System.Drawing.Point(80, 75)
$btnRun.Add_Click({
    $script:timer.Stop()
    $script:userCancelled = $false
    $form.Close()
})
$form.Controls.Add($btnRun)
$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = "Cancel"
$btnCancel.Size = New-Object System.Drawing.Size(100, 28)
$btnCancel.Location = New-Object System.Drawing.Point(200, 75)
$btnCancel.Add_Click({
    $script:timer.Stop()
    $script:userCancelled = $true
    $form.Close()
})
$form.Controls.Add($btnCancel)
$timer = New-Object System.Windows.Forms.Timer
$script:timer = $timer
$timer.Interval = 1000
$timer.Add_Tick({
    $script:countdown--
    $label.Text = "Moltbook check is about to run in $script:countdown seconds.`nGo take the dog out - I will be on Moltbook for a few minutes."
    if ($script:countdown -le 0) {
        $timer.Stop()
        $script:userCancelled = $false
        $form.Close()
    }
})
$timer.Start()
$form.Add_Shown({ $form.Activate() })
[void]$form.ShowDialog()

if ($script:userCancelled) {
    Write-Host "Moltbook check cancelled. No keystrokes sent."
    exit 0
}

# Force restore (9 = SW_RESTORE) and bring to foreground. More reliable than AppActivate when minimized or behind other apps.
$hwnd = $cursorProc.MainWindowHandle
[WindowManager]::ShowWindowAsync($hwnd, 9)
Start-Sleep -Milliseconds 300
[WindowManager]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 500

# Close any open panels first (ESC), then open Composer (Ctrl+I) so Agent mode runs the command
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait("^i")
Start-Sleep -Milliseconds 500

# Type the command and press Enter
[System.Windows.Forms.SendKeys]::SendWait("$Message{ENTER}")

Write-Host ("Sent '" + $Message + "' to Cursor. Agent should run the Moltbook check now.")
