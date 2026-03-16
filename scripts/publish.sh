#!/usr/bin/env bash

set -e

is_template_note() {
  local file="$1"
  local lines=()
  local year=""

  mapfile -t lines < "$file"

  while [ ${#lines[@]} -gt 0 ] && [ -z "${lines[${#lines[@]}-1]}" ]; do
    unset 'lines[${#lines[@]}-1]'
  done

  [ ${#lines[@]} -eq 6 ] || return 1
  [ "${lines[0]}" = "---" ] || return 1
  [ "${lines[1]}" = "title: \"Titre de la note\"" ] || return 1

  if [[ "${lines[2]}" =~ ^date:\ ([0-9]{4})-[0-9]{2}-[0-9]{2}$ ]]; then
    year="${BASH_REMATCH[1]}"
  else
    return 1
  fi

  [ "${lines[3]}" = "layout: layouts/note.njk" ] || return 1
  [ "${lines[4]}" = "tags: [note, $year]" ] || return 1
  [ "${lines[5]}" = "---" ] || return 1
}

echo "Vérification des notes template..."
shopt -s nullglob globstar
TEMPLATE_NOTES=()
for file in notes/**/*.md; do
  if is_template_note "$file"; then
    TEMPLATE_NOTES+=("$file")
  fi
done

if [ ${#TEMPLATE_NOTES[@]} -gt 0 ]; then
  echo "Publication annulée : des notes sont encore au template." >&2
  printf ' - %s\n' "${TEMPLATE_NOTES[@]}" >&2
  echo "Complète ou supprime ces notes avant de publier." >&2
  exit 1
fi

echo "Build Eleventy..."
npm run build

echo "Déploiement vers Cloudflare Pages..."
npx wrangler pages deploy _site --project-name cqja

echo "Publication terminée."
