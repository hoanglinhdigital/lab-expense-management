
$logFile = ".claude\hooks\hook-log.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$projectName = "lab-expense-management"

Add-Content -Path $logFile -Value "$timestamp - Claude Code da hoan thanh tac vu trong project: $projectName"

# Play thong bao sound
$PlayWav=New-Object System.Media.SoundPlayer
$PlayWav.SoundLocation="C:\Windows\Media\Alarm10.wav"
$PlayWav.playsync()
Start-Sleep -Milliseconds 300

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show(
  "Claude Code da hoan thanh tac vu trong project $projectName!",
  "Claude Code - Thong bao",
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
)
