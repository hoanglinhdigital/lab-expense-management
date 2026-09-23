# Doc JSON input tu stdin ma Claude Code truyen vao Hook
$rawInput = [Console]::In.ReadToEnd()
$data = $rawInput | ConvertFrom-Json
$command = $data.tool_input.command

if ([string]::IsNullOrWhiteSpace($command)) {
    exit 0
}

# Danh sach pattern nguy hiem can chan, khong phan biet lenh nam trong hay ngoai project
$dangerousRules = @(
    @{ Pattern = "Remove-Item|(^|\s)rm(\s|$)|(^|\s)del(\s|$)|rmdir|rd\s+/s"; Reason = "Lenh xoa file/thu muc bi chan boi Hook bao ve (ap dung ca file trong lan ngoai project)." },
    @{ Pattern = "git\s+push"; Reason = "Lenh git push bi chan boi Hook bao ve - can nguoi review truoc khi day code len remote repository." },
    @{ Pattern = "git\s+reset"; Reason = "Lenh git reset bi chan boi Hook bao ve - co the lam mat commit hoac lich su thay doi." }
)

foreach ($rule in $dangerousRules) {
    if ($command -match $rule.Pattern) {
        [Console]::Error.WriteLine("[BLOCKED BY HOOK] $($rule.Reason)")
        [Console]::Error.WriteLine("Lenh bi chan: $command")
        exit 2
    }
}

# Khong khop pattern nguy hiem nao -> cho phep chay binh thuong
exit 0