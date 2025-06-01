#!/bin/bash

# Deploy static version to surge.sh (no backend needed)

echo "🚀 Preparing static deployment for surge.sh..."

# Create clean deployment directory
rm -rf dist/
mkdir -p dist/

# Copy static files only
cp index.html dist/
cp -r css/ dist/
cp -r js/ dist/
cp -r assets/ dist/

# Remove backend-related files (not needed for static)
echo "📦 Static files prepared in dist/"
echo "💡 To deploy: cd dist && npx surge --domain beautiful-qr-codes-sk-v5.surge.sh"

ls -la dist/ 