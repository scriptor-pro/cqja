#!/usr/bin/env bash

set -e

BASE_DIR="notes/$(date +%Y)"
YEAR=$(date +%Y)
DATE_FULL=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%H%M%S)

mkdir -p "$BASE_DIR"

TAGS=""
while getopts "t:" opt; do
  case $opt in
    t) TAGS=$OPTARG ;;
  esac
done
shift $((OPTIND - 1))

TEXT="$*"

if [ -z "$TEXT" ]; then
  echo "Erreur : texte requis."
  exit 1
fi

# Slug
SLUG=$(echo "$TEXT"   | iconv -t ascii//TRANSLIT 2>/dev/null   | tr '[:upper:]' '[:lower:]'   | tr -cd 'a-z0-9 '   | tr ' ' '-'   | cut -c1-50)

FILENAME="$BASE_DIR/$DATE_FULL-$TIMESTAMP-$SLUG.md"

# Normalisation tags
normalize_tags() {
  echo "$1" \
    | iconv -t ascii//TRANSLIT 2>/dev/null \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[[:space:]]\+/-/g' \
    | tr -cd 'a-z0-9,-' \
    | sed 's/,,*/,/g' \
    | sed 's/^,//;s/,$//' \
    | tr ',' '\n' \
    | sed '/^$/d' \
    | awk '!seen[$0]++ { printf "  - \"%s\"\n", $0 }'
}

AUTO_KEYWORDS=$(echo "$TEXT"   | iconv -t ascii//TRANSLIT 2>/dev/null   | tr '[:upper:]' '[:lower:]'   | tr -cd 'a-z0-9 '   | tr ' ' '\n'   | awk 'length > 6'   | sort | uniq | head -n 3   | paste -sd "," -)

ALL_TAGS="note,$YEAR,$TAGS,$AUTO_KEYWORDS"
FORMATTED_TAGS=$(normalize_tags "$ALL_TAGS")

cat <<EOF > "$FILENAME"
---
title: "$TEXT"
date: $DATE_FULL
layout: layouts/note.njk
tags:
${FORMATTED_TAGS}
---

$TEXT

EOF

echo "Note créée : $FILENAME"

if [ -n "$EDITOR" ]; then
  "$EDITOR" "$FILENAME"
fi
