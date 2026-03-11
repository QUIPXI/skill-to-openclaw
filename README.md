# Skill → OpenClaw Converter

Convert Claude Code skills to OpenClaw skill format.

## Install

```bash
curl -sL https://raw.githubusercontent.com/quipxi/skill-to-openclaw/main/install.sh | bash
```

Requires: Node.js 18+, Git

## Usage

```bash
# From GitHub
skill-to-openclaw owner/repo

# From local path
skill-to-openclaw ./my-skill
```

## Example

```bash
$ skill-to-openclaw ParthJadhav/app-store-screenshots

🔄 Converting: ParthJadhav/app-store-screenshots
📦 Cloning...
📄 Found: skills/app-store-screenshots/SKILL.md
✨ Skill: app-store-screenshots
✅ Saved to: ~/.openclaw/skills/app-store-screenshots

Restart OpenClaw or run: openclaw skills sync
```

## What It Does

1. Accepts GitHub repo, URL, or local path
2. Finds SKILL.md in the skill folder
3. Parses frontmatter (name, description, triggers)
4. Copies supporting files
5. Saves to `~/.openclaw/skills/[name]/`

## Options

- `--name` — Custom skill name
- `--force` — Overwrite existing
- `--dry-run` — Preview without writing

## Related

- [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) — 170+ skills that already work on both Claude Code and OpenClaw

## License

MIT
