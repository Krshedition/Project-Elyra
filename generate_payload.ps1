$files = @(
    'package.json', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json',
    'tsconfig.node.json', 'index.html', 'electron/main.ts', 'electron/preload.ts',
    'src/main.tsx', 'src/App.tsx', 'src/WaveWidget.tsx', 'src/hooks/useLiveSession.ts',
    'src/lib/audio-recorder.ts', 'src/lib/audio-streamer.ts', 'src/index.css',
    'src/App.css', 'README.md', '.env', '.gitignore'
)
$out = @()
foreach ($f in $files) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        $out += [PSCustomObject]@{
            path = $f
            content = $content
        }
    }
}
$out | ConvertTo-Json -Depth 10 | Set-Content mcp_files.json
