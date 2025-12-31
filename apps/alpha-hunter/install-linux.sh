#!/bin/bash
#
# Alpha Hunter Linux Installation Script
# Run as root: sudo bash install-linux.sh
#

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       🤖 ALPHA HUNTER LINUX INSTALLER                            ║"
echo "║                                                                  ║"
echo "║       24/7 AI Trading Bot - Coinbase + Kalshi                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root: sudo bash install-linux.sh"
  exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm
fi

# Create installation directory
INSTALL_DIR="/opt/alpha-hunter"
echo "📂 Creating installation directory: $INSTALL_DIR"
mkdir -p $INSTALL_DIR
mkdir -p /var/log/alpha-hunter

# Copy files
echo "📋 Copying files..."
cp -r . $INSTALL_DIR/
cd $INSTALL_DIR

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --prod

# Check for .env.local
if [ ! -f ".env.local" ]; then
  echo ""
  echo "⚠️  WARNING: .env.local not found!"
  echo "   Create it with your API keys:"
  echo ""
  echo "   cat > /opt/alpha-hunter/.env.local << 'EOF'"
  echo "   COINBASE_API_KEY=your-key"
  echo "   COINBASE_API_SECRET=your-secret"
  echo "   KALSHI_API_KEY_ID=your-kalshi-id"
  echo "   KALSHI_PRIVATE_KEY=your-kalshi-key"
  echo "   ANTHROPIC_API_KEY=your-claude-key"
  echo "   THE_ODDS_API_KEY=your-odds-api-key"
  echo "   EOF"
  echo ""
fi

# Install systemd service
echo "🔧 Installing systemd service..."
cp alpha-hunter.service /etc/systemd/system/
systemctl daemon-reload

# Enable and start
echo "🚀 Enabling service..."
systemctl enable alpha-hunter

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       ✅ INSTALLATION COMPLETE!                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Commands:"
echo ""
echo "   Start:     sudo systemctl start alpha-hunter"
echo "   Stop:      sudo systemctl stop alpha-hunter"
echo "   Status:    sudo systemctl status alpha-hunter"
echo "   Logs:      sudo journalctl -u alpha-hunter -f"
echo "   Output:    tail -f /var/log/alpha-hunter/output.log"
echo ""
echo "🔧 Configuration: /opt/alpha-hunter/.env.local"
echo ""

# Ask to start now
read -p "Start the service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  systemctl start alpha-hunter
  echo "✅ Service started!"
  echo ""
  echo "View logs: sudo journalctl -u alpha-hunter -f"
fi

