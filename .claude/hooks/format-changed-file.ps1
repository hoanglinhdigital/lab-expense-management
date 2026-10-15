
# Đọc toàn bộ JSON mà Claude Code truyền vào qua stdin
$stdinJson = [Console]::In.ReadToEnd()

try {
    $hookData = $stdinJson | ConvertFrom-Json
} catch {
    # JSON không hợp lệ -> bỏ qua, không chặn Claude Code
    exit 0
}

# Đường dẫn file vừa được Edit/Write nằm ở field tool_input.file_path
$filePath = $hookData.tool_input.file_path
if ([string]::IsNullOrWhiteSpace($filePath)) {
    exit 0
}

# Chỉ format các phần mở rộng mà Prettier hỗ trợ trong project này
$supportedExt = @('.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md')
$ext = [System.IO.Path]::GetExtension($filePath)
if ($supportedExt -notcontains $ext) {
    exit 0
}

if (Test-Path -LiteralPath $filePath) {
    npx prettier --write "$filePath"
}
