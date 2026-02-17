#!/bin/bash
# Standalone EAS Build Script for IPTV Viewer
# This script creates a clean build context to avoid monorepo issues

set -e

PROFILE=${1:-preview}
PLATFORM=${2:-android}

echo "🏗️  IPTV Viewer Standalone Build"
echo "================================="
echo "Profile: $PROFILE"
echo "Platform: $PLATFORM"
echo ""

# Create temporary build directory
BUILD_DIR=$(mktemp -d)
echo "📁 Build directory: $BUILD_DIR"

# Copy essential files
echo "📦 Copying project files..."
cp -r "$(pwd)/apps/IPTVviewer" "$BUILD_DIR/"

# Change to build directory
cd "$BUILD_DIR/IPTVviewer"

# Remove node_modules and reinstall (clean install)
echo "🧹 Cleaning node_modules..."
rm -rf node_modules

echo "📥 Installing dependencies..."
npm ci

echo "🔍 Running TypeScript check..."
npx tsc --noEmit

echo "🏗️  Starting EAS build..."
eas build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive

# Cleanup
echo "🧹 Cleaning up..."
cd -
rm -rf "$BUILD_DIR"

echo "✅ Build complete!"
