#!/bin/bash
# Update Homebrew formula with correct version and checksum
# Usage: ./scripts/update-homebrew-formula.sh <version>

set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
FORMULA_REPO="chuckycastle/homebrew-cidrly"
FORMULA_PATH="Formula/cidrly.rb"

echo "Updating Homebrew formula for cidrly v${VERSION}"

# Download tarball and calculate SHA256
TARBALL_URL="https://registry.npmjs.org/cidrly/-/cidrly-${VERSION}.tgz"
echo "Downloading tarball from ${TARBALL_URL}..."

SHA256=$(curl -sL "${TARBALL_URL}" | shasum -a 256 | awk '{print $1}')

if [ -z "$SHA256" ]; then
  echo "Error: Failed to download tarball or calculate checksum"
  exit 1
fi

echo "Calculated SHA256: ${SHA256}"

# Clone the homebrew-cidrly repo
TEMP_DIR=$(mktemp -d)
cd "${TEMP_DIR}"
git clone "https://github.com/${FORMULA_REPO}.git"
cd homebrew-cidrly

# Update the formula
sed -i.bak "s|url \"https://registry.npmjs.org/cidrly/-/cidrly-.*\.tgz\"|url \"${TARBALL_URL}\"|" "${FORMULA_PATH}"
sed -i.bak "s|sha256 \".*\"|sha256 \"${SHA256}\"|" "${FORMULA_PATH}"
rm "${FORMULA_PATH}.bak"

# Show the changes
echo ""
echo "Formula changes:"
git diff "${FORMULA_PATH}"

echo ""
echo "Formula updated in ${TEMP_DIR}/homebrew-cidrly"
echo ""
echo "To commit and push:"
echo "  cd ${TEMP_DIR}/homebrew-cidrly"
echo "  git add ${FORMULA_PATH}"
echo "  git commit -m \"Update cidrly to v${VERSION}\""
echo "  git push origin main"
