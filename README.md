# Skill → OpenClaw Skill Converter

Convert Claude Code skills to OpenClaw skill format with a single command.

## Install

```bash
# Quick install (via curl)
curl -sL https://raw.githubusercontent.com/your-repo/skill-to-openclaw/main/install.sh | bash

# Or manual
git clone https://github.com/your-repo/skill-to-openclaw.git ~/skill-to-openclaw
ln -sf ~/skill-to-openclaw/skill-to-openclaw.js ~/.local/bin/skill-to-openclaw
```

## Usage

```bash
# From GitHub repo
skill-to-openclaw owner/repo
skill-to-openclaw https://github.com/owner/repo

# From local path
skill-to-openclaw ./my-claude-skill

# With custom name
skill-to-openclaw owner/repo --name my-skill

# Overwrite existing
skill-to-openclaw owner/repo --force

# Preview without writing
skill-to-openclaw owner/repo --dry-run
```

## Options

| Flag | Description |
|------|-------------|
| `-n, --name` | Output skill name |
| `-f, --force` | Overwrite existing skill |
| `-d, --dry-run` | Preview without writing |
| `-h, --help` | Show help |

## What It Does

1. Accepts GitHub repo, URL, or local path
2. Finds SKILL.md in the skill folder
3. Parses frontmatter (name, description, triggers)
4. Copies supporting files
5. Converts to OpenClaw format
6. Saves to `~/.openclaw/skills/[name]/`

## Example

```bash
# Convert the app-store-screenshots skill
$ skill-to-openclaw ParthJadhav/app-store-screenshots

🔄 Converting: ParthJadhav/app-store-screenshots
📦 Cloning ParthJadhav/app-store-screenshots...
📄 Found: skills/app-store-screenshots/SKILL.md
✨ Skill: app-store-screenshots
📝 Description: Use when building App Store screenshot pages...
🏷️  Triggers: app store, screenshots, marketing assets
✅ Saved to: ~/.openclaw/skills/app-store-screenshots
🎉 Skill "app-store-screenshots" ready!
```

## Requirements

- Node.js 18+
- Git
- Internet (for GitHub repos)

## License

MIT
