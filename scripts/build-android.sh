#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# BizLedger — Local Android APK Build Script
# Run this on your PC to generate a standalone .apk file
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit on any error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BizLedger — Android APK Build          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check Node.js ────────────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"

# ── Step 2: Check Java ───────────────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Checking Java (required for Android build)...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${RED}✗ Java not found.${NC}"
    echo "  Install Java 17 (LTS) from: https://adoptium.net"
    echo "  Or via winget: winget install Microsoft.OpenJDK.17"
    echo "  Or via brew (Mac): brew install openjdk@17"
    exit 1
fi
JAVA_VERSION=$(java -version 2>&1 | head -1)
echo -e "${GREEN}✓ $JAVA_VERSION${NC}"

# ── Step 3: Check Android SDK ────────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Checking Android SDK...${NC}"
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo -e "${RED}✗ ANDROID_HOME not set.${NC}"
    echo "  Install Android Studio from: https://developer.android.com/studio"
    echo "  Then set ANDROID_HOME in your environment:"
    echo "  Windows: setx ANDROID_HOME \"%LOCALAPPDATA%\\Android\\Sdk\""
    echo "  Mac/Linux: export ANDROID_HOME=\$HOME/Library/Android/sdk"
    exit 1
fi
ANDROID_SDK=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
echo -e "${GREEN}✓ Android SDK at $ANDROID_SDK${NC}"

# ── Step 4: Run expo prebuild if android/ folder doesn't exist ───────────────
echo -e "${YELLOW}[4/5] Checking native Android project...${NC}"
if [ ! -d "android" ]; then
    echo "  android/ folder not found. Running expo prebuild..."
    npx expo prebuild --platform android --no-install
    echo -e "${GREEN}✓ Native project generated${NC}"
    
    # Apply our custom gradle settings after prebuild
    apply_gradle_config
else
    echo -e "${GREEN}✓ android/ folder exists${NC}"
fi

# ── Step 5: Build APK ────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/5] Building APK (this takes 5-10 minutes)...${NC}"
echo ""

cd android

# Make gradlew executable (Linux/Mac)
chmod +x gradlew 2>/dev/null || true

# Build release APK
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
    # Windows
    ./gradlew.bat assembleRelease
else
    # Mac / Linux
    ./gradlew assembleRelease
fi

cd ..

# ── Done ─────────────────────────────────────────────────────────────────────
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ APK BUILD SUCCESSFUL!                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  APK file: ${BLUE}$APK_PATH${NC}"
    echo -e "  Size:     ${BLUE}$APK_SIZE${NC}"
    echo ""
    echo "  To install on an Android device:"
    echo "  1. Copy the APK file to your phone"
    echo "  2. Open it on your phone"
    echo "  3. Enable 'Install from unknown sources' if prompted"
    echo "     (Settings → Security → Install unknown apps)"
    echo ""
else
    echo -e "${RED}✗ APK not found. Build may have failed. Check errors above.${NC}"
    exit 1
fi
