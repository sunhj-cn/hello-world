# hello-world
here is a edited version or README.md
I would take this as changes to the file.

## Cursor CLI status line

This repo includes a custom [Cursor CLI status line](https://code.claude.com/docs/en/statusline) that shows the model, current folder, git branch (with a `*` when the tree is dirty), and a color-coded context-window bar.

Install it into your local Cursor CLI config:

```bash
mkdir -p ~/.cursor
cp .cursor/statusline.sh ~/.cursor/statusline.sh
chmod +x ~/.cursor/statusline.sh
```

If `~/.cursor/cli-config.json` does not exist yet, copy the example:

```bash
cp .cursor/cli-config.example.json ~/.cursor/cli-config.json
```

Otherwise merge this into the existing file:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.cursor/statusline.sh",
    "padding": 2
  }
}
```

Restart the Cursor CLI (or start a new message) to see it. Preview with mock input:

```bash
echo '{"model":{"display_name":"Grok 4.6","param_summary":"(Thinking)"},"workspace":{"current_dir":"'"$PWD"'"},"context_window":{"used_percentage":42},"version":"1.2.3"}' | .cursor/statusline.sh
```
