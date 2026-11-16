#!/usr/bin/env bash
# Alte Dateien im Website-Ordner bei STRATO aufräumen: die frühere Testseite
# von wilpo.net und die ZIP-Teile vom Hochladen von Hand.
# Auf dem App-Server als root:
#   bash /root/website-alte-dateien-entfernen.sh               nur anzeigen
#   bash /root/website-alte-dateien-entfernen.sh --ausfuehren  nach Rückfrage löschen
#
# Gelöscht wird nur, was die neue Website nicht enthält, und erst wenn sie
# vollständig hochgeladen ist. Es bleiben immer: alle Dateien der neuen
# Website, die Google-Bestätigungsdatei, .htaccess und versteckte Ordner
# (.well-known). In einem Ordner mit anderen Projekten wird nichts gelöscht.
set -uo pipefail

APP=/apps/wpapp/backend
if [ "$(id -u)" != 0 ]; then echo "Bitte als root ausführen."; exit 1; fi
cd "$APP" || exit 1

LIST=$(mktemp)
trap 'rm -f "$LIST"' EXIT

node website/upload.js --orphans "$LIST" || exit 1
COUNT=$(node -e 'try { console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).length); } catch { console.log(0); }' "$LIST")
[ "$COUNT" = 0 ] && exit 0

if [ "${1:-}" != "--ausfuehren" ]; then
  echo
  echo "Nur angezeigt, nichts gelöscht. Zum Löschen: bash $0 --ausfuehren"
  exit 0
fi

echo
read -rp "Diese $COUNT Dateien endgültig vom Webspace löschen? Zum Bestätigen JA eingeben: " answer
if [ "$answer" != "JA" ]; then echo "Abgebrochen, nichts gelöscht."; exit 0; fi
node website/upload.js --remove-orphans "$LIST"
