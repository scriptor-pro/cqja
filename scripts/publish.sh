#!/usr/bin/env bash

set -e

echo "Build Eleventy..."
npm run build

echo "Déploiement vers Cloudflare Pages..."
npx wrangler pages deploy _site --project-name cqja

echo "Publication terminée."
