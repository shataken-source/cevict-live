#!/bin/bash
# EAS Build Script for IPTV Viewer
# Usage: ./scripts/build.sh [development|preview|production]

set -e

PROFILE=${1:-preview}
PLATFORM=${2:-android}

echo "🏗️  EAS Build Script"
echo "======================"
echo "Profile: $PROFILE"
echo "Platform: $PLATFORM"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: No package.json found. Make sure you're in apps/IPTVviewer/ directory"
    exit 1
fi

# Check if eas CLI is installed
if ! command -v eas &> /dev/null; then
    echo "⚠️  EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    echo "🔐 Please login to EAS first:"
    eas login
fi

echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running TypeScript check..."
npx tsc --noEmit

echo "🏗️  Starting EAS build..."
eas build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive

echo "✅ Build submitted to EAS!"
echo ""
echo "Monitor build at: https://expo.dev/accounts/[account]/projects/iptvviewer/builds"
