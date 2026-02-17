#!/bin/bash
# Standalone IPTV Viewer Build Script
# Creates isolated build context outside monorepo to avoid EAS issues

set -e

PROFILE=${1:-preview}
PLATFORM=${2:-android}

echo "🏗️  IPTV Viewer Standalone Build"
echo "================================="
echo "Profile: $PROFILE | Platform: $PLATFORM"
echo ""

# Create temp build directory
BUILD_DIR=$(mktemp -d)
echo "📁 Build dir: $BUILD_DIR"

# Copy project files (not node_modules)
echo "📦 Copying project..."
rsync -av --exclude='node_modules' --exclude='.expo' --exclude='android' --exclude='ios' \
  "$(pwd)/apps/IPTVviewer/" "$BUILD_DIR/"

# Enter build directory
cd "$BUILD_DIR"

# Clean up any copied temp files
rm -rf .snapshots .worktrees

# Create minimal .easignore
cat > .easignore << 'EOF'
# Local excludes only - we're already isolated
node_modules/
.expo/
android/
ios/
build/
EOF

# Install dependencies fresh
echo "📥 npm ci..."
npm ci

echo "🔍 TypeScript check..."
npx tsc --noEmit

echo "🏗️  Starting EAS build from isolated context..."
eas build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive

# Cleanup
cd /
rm -rf "$BUILD_DIR"

echo "✅ Done!"
