#!/usr/bin/env bash
# Firmen-Website: automatischen Upload zu STRATO einrichten.
# Auf dem App-Server als root:  bash /root/website-einrichten.sh
#
# Fragt den SFTP-Zugang ab (das Passwort wird nicht angezeigt), prüft ihn und
# trägt ihn in die .env des Backends ein (vorher wird sie gesichert). Danach
# erstellt der App-Server die Website jede Nacht, nach jedem Taifun-Bestand und
# nach Änderungen im PC-Programm neu und lädt nur geänderte Dateien hoch.
set -uo pipefail

APP=/apps/wpapp/backend
ENV_FILE="$APP/.env"
STATE="$APP/data/website-state.json"

if [ "$(id -u)" != 0 ]; then echo "Bitte als root ausführen."; exit 1; fi
if [ ! -f "$ENV_FILE" ]; then echo "$ENV_FILE fehlt."; exit 1; fi
cd "$APP" || exit 1

echo
echo "Website-Upload zu STRATO einrichten"
echo "==================================="
echo "Die Zugangsdaten stehen im STRATO-Kundenlogin unter"
echo "  Ihr Paket > Datenbanken und Webspace > SFTP & SSH."
echo "Empfohlen: dort einen eigenen Zugang anlegen, Typ SFTP, Startverzeichnis /wilpo."
echo "Dann sieht der App-Server nur den Ordner der Website und nicht die anderen Projekte."
echo

read -rp "Server (steht bei STRATO, z. B. ssh.strato.de): " HOST
read -rp "Benutzername: " SUSER
read -rsp "Passwort (wird nicht angezeigt): " SPASS; echo
read -rp "Ordner der Website [Enter = /, passt zum Startverzeichnis /wilpo]: " SDIR

# Eingaben säubern: "sftp://server:22/" geht auch
SPORT=22
HOST=$(printf '%s' "$HOST" | tr -d '[:space:]')
HOST=${HOST#sftp://}
HOST=${HOST%%/*}
if [[ $HOST == *:* ]]; then SPORT=${HOST##*:}; HOST=${HOST%%:*}; fi
SUSER=$(printf '%s' "$SUSER" | tr -d '[:space:]')
SDIR=$(printf '%s' "${SDIR:-/}" | tr -d '[:space:]')
[[ $SDIR == /* ]] || SDIR="/$SDIR"

if [ -z "$HOST" ] || [ -z "$SUSER" ] || [ -z "$SPASS" ]; then
  echo "Server, Benutzername und Passwort werden gebraucht. Nichts geändert."; exit 1
fi
if ! [[ $SPORT =~ ^[0-9]+$ ]]; then echo "Port \"$SPORT\" ist keine Zahl. Nichts geändert."; exit 1; fi
# In der .env stehen die Werte in einfachen Hochkommas, damit # und Leerzeichen dazugehören
for v in "$HOST" "$SUSER" "$SPASS" "$SDIR"; do
  if [[ $v == *"'"* ]]; then
    echo "Ein Hochkomma (') geht hier nicht. Bitte bei STRATO ein Passwort ohne ' vergeben und das Skript neu starten."; exit 1
  fi
done

echo
echo "Prüfe den Zugang ..."
WEBSITE_SFTP_HOST="$HOST" WEBSITE_SFTP_PORT="$SPORT" WEBSITE_SFTP_USER="$SUSER" \
  WEBSITE_SFTP_PASSWORD="$SPASS" WEBSITE_SFTP_DIR="$SDIR" node website/upload.js --check
rc=$?
case $rc in
  0) ;;
  2)
    read -rp "Diesen Ordner trotzdem für die Website verwenden? (ja/nein): " answer
    if [ "$answer" != "ja" ]; then echo "Abgebrochen, nichts geändert."; exit 1; fi
    ;;
  3)
    echo "Bitte als Ordner /wilpo angeben oder bei STRATO einen Zugang mit Startverzeichnis /wilpo anlegen. Nichts geändert."
    exit 1
    ;;
  *)
    echo "Nichts geändert. Bitte die Angaben prüfen und das Skript neu starten."
    exit 1
    ;;
esac

# Kommt gleich eine erste Aktualisierung? (nicht, wenn die Website schon auf genau
# diesem Webspace liegt und die letzte Aktualisierung geklappt hat)
NEWTARGET=$(WEBSITE_SFTP_HOST="$HOST" WEBSITE_SFTP_PORT="$SPORT" WEBSITE_SFTP_USER="$SUSER" \
  WEBSITE_SFTP_PASSWORD="$SPASS" WEBSITE_SFTP_DIR="$SDIR" \
  node -e 'const c = require("./website/upload").config(); console.log(`${c.username}@${c.host}:${c.dir}`)')
WILLRUN=$(node -e '
  let last = null;
  try { last = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).last; } catch {}
  console.log(!last || last.target !== process.argv[2] || !last.ok ? "ja" : "nein");
' "$STATE" "$NEWTARGET")

BACKUP="$ENV_FILE.vor-website-$(date +%Y%m%d-%H%M%S)"
cp -p "$ENV_FILE" "$BACKUP" || { echo "Sicherung der .env fehlgeschlagen. Nichts geändert."; exit 1; }
TMP=$(mktemp)
grep -vE "^(WEBSITE_SFTP_(HOST|PORT|USER|PASSWORD|DIR)=|# Firmen-Website: Upload zu STRATO)" "$ENV_FILE" > "$TMP"
{
  printf '%s\n' "# Firmen-Website: Upload zu STRATO (eingerichtet am $(date +%d.%m.%Y) mit website-einrichten.sh)"
  printf "WEBSITE_SFTP_HOST='%s'\n" "$HOST"
  printf 'WEBSITE_SFTP_PORT=%s\n' "$SPORT"
  printf "WEBSITE_SFTP_USER='%s'\n" "$SUSER"
  printf "WEBSITE_SFTP_PASSWORD='%s'\n" "$SPASS"
  printf "WEBSITE_SFTP_DIR='%s'\n" "$SDIR"
  # Testmodus (noindex) bleibt, bis die Website unter wilkenpoelker.de live geht
  grep -q '^WEBSITE_MODE=' "$TMP" || printf 'WEBSITE_MODE=test\n'
} >> "$TMP"
cat "$TMP" > "$ENV_FILE"
rm -f "$TMP"
unset SPASS

BEFORE=$(stat -c %Y "$STATE" 2>/dev/null || echo 0)
pm2 restart wpapp-backend --update-env > /dev/null && pm2 save > /dev/null
echo
echo "Gespeichert und Backend neu gestartet (Sicherung der alten .env: $BACKUP)."

if [ "$WILLRUN" != "ja" ]; then
  echo "Die Website liegt schon auf diesem Webspace. Sie wird nachts und nach Änderungen"
  echo "aktualisiert, im PC-Programm unter Produkte auch sofort per Knopf."
  exit 0
fi

echo
echo "Die erste Aktualisierung startet in etwa 2 Minuten. Beim ersten Mal werden alle"
echo "Seiten und Bilder hochgeladen, das dauert einige Minuten. Dieses Fenster darf auch"
echo "geschlossen werden, die Aktualisierung läuft auf dem Server weiter; den Stand zeigt"
echo "das PC-Programm unter Produkte."
printf "Warte auf das Ergebnis "
for _ in $(seq 1 200); do
  sleep 15
  NOW=$(stat -c %Y "$STATE" 2>/dev/null || echo 0)
  if [ "$NOW" != "$BEFORE" ]; then
    echo
    node -e '
      const last = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).last || {};
      console.log(last.ok ? last.summary : `Fehler: ${last.error || "unbekannt"}`);
      process.exit(last.ok ? 0 : 1);
    ' "$STATE" || exit 1
    echo
    echo "Testseite: https://wilpo.net/ (für Suchmaschinen gesperrt, solange WEBSITE_MODE=test)"
    echo "Alte Dateien der früheren Testseite anzeigen und aufräumen:"
    echo "  bash /root/website-alte-dateien-entfernen.sh"
    exit 0
  fi
  printf "."
done
echo
echo "Noch nicht fertig. Den Stand zeigt das PC-Programm unter Produkte."
