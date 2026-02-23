#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Generate a release keystore for signing the Android APK
# Run this ONCE and keep the keystore file safe!
# ─────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

KEYSTORE_FILE="bizledger-release.keystore"
KEY_ALIAS="bizledger"

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BizLedger — Generate Release Keystore  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

if [ -f "$KEYSTORE_FILE" ]; then
    echo -e "${YELLOW}⚠  $KEYSTORE_FILE already exists. Delete it first to regenerate.${NC}"
    exit 0
fi

echo "You will be asked for:"
echo "  - A keystore password (remember this!)"
echo "  - Your name / organisation details"
echo ""

keytool -genkeypair \
    -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000

if [ -f "$KEYSTORE_FILE" ]; then
    echo ""
    echo -e "${GREEN}✓ Keystore generated: $KEYSTORE_FILE${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT — Copy these lines into android/gradle.properties:${NC}"
    echo ""
    echo "MYAPP_RELEASE_STORE_FILE=../../bizledger-release.keystore"
    echo "MYAPP_RELEASE_KEY_ALIAS=$KEY_ALIAS"
    echo "MYAPP_RELEASE_STORE_PASSWORD=<your_password>"
    echo "MYAPP_RELEASE_KEY_PASSWORD=<your_password>"
    echo ""
    echo -e "${RED}⚠  NEVER commit the .keystore file to Git!${NC}"
    echo "   Add this to .gitignore: *.keystore"
fi
