# Demo: grade a public page, then scan it.
# Regenerate from the repo root:  pnpm build && vhs docs/demo/scan.tape
# The hidden setup maps `npx personaudit` to the locally BUILT CLI (dist/cli.js),
# so the recording shows the command users actually type.

Output docs/demo/scan.gif

Set Shell "bash"
Set FontSize 20
Set Width 1200
Set Height 700
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms
Set Framerate 20

Hide
Type `PA_CLI="$PWD/dist/cli.js"; npx() { shift; node "$PA_CLI" "$@"; }; export PS1='$ '; export NO_COLOR=; clear` Enter
Show

Sleep 600ms
Type "npx personaudit grade https://example.com --max-pages 2" Sleep 500ms Enter
Sleep 9s

Type "clear" Enter
Type "npx personaudit scan https://example.com --max-pages 2 -o /tmp/personaudit-demo" Sleep 500ms Enter
Sleep 9s
