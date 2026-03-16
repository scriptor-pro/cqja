#!/usr/bin/env bash

set -e

if command -v locale >/dev/null 2>&1; then
  AVAILABLE_LOCALES=$(locale -a 2>/dev/null || true)
  if [[ "$AVAILABLE_LOCALES" == *"fr_FR.utf8"* ]]; then
    export LC_CTYPE="fr_FR.UTF-8"
  elif [[ "$AVAILABLE_LOCALES" == *"C.UTF-8"* ]]; then
    export LC_CTYPE="C.UTF-8"
  fi
fi

BASE_DIR="notes/$(date +%Y)"
YEAR=$(date +%Y)
DATE_FULL=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H%M%S)
FILE_EXTENSION="md"

mkdir -p "$BASE_DIR"

while getopts "t:" opt; do
  case $opt in
    t) ;;
  esac
done
shift $((OPTIND - 1))

TEXT="$*"

# Slug
SLUG_SOURCE="$TEXT"
if [ -z "$SLUG_SOURCE" ]; then
  SLUG_SOURCE="note"
fi

SLUG=$(echo "$SLUG_SOURCE"   | iconv -t ascii//TRANSLIT 2>/dev/null   | tr '[:upper:]' '[:lower:]'   | tr -cd 'a-z0-9 '   | tr ' ' '-'   | cut -c1-50)

FILENAME="$BASE_DIR/$DATE_FULL-$TIMESTAMP-$SLUG.$FILE_EXTENSION"

cat <<EOF > "$FILENAME"
---
title: "Titre de la note"
date: $DATE_FULL
layout: layouts/note.njk
tags: [note, $YEAR]
---

EOF

echo "Note créée : $FILENAME"

micro "$FILENAME"
