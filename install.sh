#!/usr/bin/env bash
# Install skill-to-openclaw
# Usage: curl -sL https://raw.githubusercontent.com/your-repo/skill-to-openclaw/main/install.sh | bash

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/your-repo/skill-to-openclaw.git}"
INSTALL_DIR="${HOME}/.skill-to-openclaw"
BIN_DIR="${HOME}/.local/bin"
SCRIPT_NAME="skill-to-openclaw"

echo "📦 Installing skill-to-openclaw..."

# Clone or update
if [[ -d "$INSTALL_DIR" ]]; then
    echo "📂 Updating existing installation..."
    cd "$INSTALL_DIR" && git pull
else
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

# Create bin dir if needed
mkdir -p "$BIN_DIR"

# Link script
rm -f "$BIN_DIR/$SCRIPT_NAME"
ln -sf "$INSTALL_DIR/$SCRIPT_NAME.js" "$BIN_DIR/$SCRIPT_NAME"

echo "✅ Installed to: $BIN_DIR/$SCRIPT_NAME"
echo ""
echo "Usage:"
echo "  $SCRIPT_NAME owner/repo"
echo "  $SCRIPT_NAME ./local-skill --name my-skill"
echo ""
echo "Restart your shell or run: source ~/.bashrc"
