#!/usr/bin/env bash
# Schutz für das PC-Programm (https://api.wilkenpoelker.de/pc/) einrichten.
# Auf dem App-Server als root:  bash /root/pc-schutz-einrichten.sh
#
# Bisher kann sich jeder, der die Adresse kennt, als Abteilung anmelden. Danach
# geht das nur noch auf Firmen-PCs, die einmal mit einem Kopplungscode
# freigeschaltet wurden. Das Skript
#   1. setzt ein neues Admin-Passwort (wird nicht angezeigt, nur als Hash gespeichert),
#   2. erstellt Kopplungscodes für die PCs (24 Stunden gültig, je PC ein Code),
#   3. zeigt, welche PCs freigeschaltet sind, und
#   4. schaltet den Schutz ein.
# Vorher wird die .env gesichert. Weitere PCs schaltet der Admin später selbst
# frei (PC-Programm -> "PCs"); dort kann er auch PCs sperren.
#
#   bash /root/pc-schutz-einrichten.sh          einrichten (Schritt für Schritt, mit Rückfragen)
#   bash /root/pc-schutz-einrichten.sh --liste  nur anzeigen, welche PCs freigeschaltet sind
#   bash /root/pc-schutz-einrichten.sh --aus    Schutz wieder ausschalten (Notfall)
set -uo pipefail

APP=${WP_APP_DIR:-/apps/wpapp/backend}
ENV_FILE=${WP_ENV_FILE:-"$APP/.env"}
PM2_NAME=wpapp-backend

if [ "$(id -u)" != 0 ]; then echo "Bitte als root ausführen."; exit 1; fi
if [ ! -f "$ENV_FILE" ]; then echo "$ENV_FILE fehlt."; exit 1; fi
cd "$APP" || exit 1
if [ ! -f scripts/desktop-devices.js ]; then
  echo "Das Backend ist noch nicht auf dem neuesten Stand (scripts/desktop-devices.js fehlt)."; exit 1
fi
PORT=$(grep -E '^PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2 | tr -d "'\"[:space:]")
PORT=${PORT:-5000}

devices() { DOTENV_CONFIG_QUIET=true node scripts/desktop-devices.js "$@"; }

# Sets KEY=VALUE in the .env (old lines of that key and their comment removed).
# The .env is backed up once per run, before the first change.
BACKUP=""
set_env() {
  local key="$1" value="$2" comment="$3" tmp
  if [ -z "$BACKUP" ]; then
    BACKUP="$ENV_FILE.vor-pc-schutz-$(date +%Y%m%d-%H%M%S)"
    cp -p "$ENV_FILE" "$BACKUP" || { echo "Sicherung der .env fehlgeschlagen. Nichts geändert."; exit 1; }
    chmod 600 "$BACKUP"
  fi
  tmp=$(mktemp)
  grep -vE "^${key}=|^# ${comment}" "$ENV_FILE" > "$tmp"
  if [ -n "$value" ]; then
    printf '%s\n' "# ${comment} (gesetzt am $(date +%d.%m.%Y) mit pc-schutz-einrichten.sh)" >> "$tmp"
    printf "%s='%s'\n" "$key" "$value" >> "$tmp"
  fi
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  # Only root may read the .env (passwords, keys); the backend runs as root
  chmod 600 "$ENV_FILE"
}

restart_backend() {
  echo "Starte das Backend neu ..."
  # No --update-env: the backend reads the .env itself on every start
  pm2 restart "$PM2_NAME" > /dev/null && pm2 save > /dev/null
  for _ in $(seq 1 30); do
    sleep 2
    STATUS=$(curl -s --max-time 5 -X POST -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1:$PORT/api/desktop/device/status") && [ -n "$STATUS" ] && break
  done
  printf '%s' "${STATUS:-}" | node -e '
    let s = ""; process.stdin.on("data", (d) => { s += d; }).on("end", () => {
      let d = null; try { d = JSON.parse(s).data; } catch {}
      if (!d) { console.log("Das Backend antwortet noch nicht. Bitte prüfen: pm2 logs '"$PM2_NAME"' --lines 50"); return; }
      console.log(d.required ? "Der Schutz ist EINGESCHALTET: nur freigeschaltete PCs können sich anmelden." : "Der Schutz ist aus: jeder PC kann sich anmelden.");
    });'
}

if [ "${1:-}" = "--liste" ]; then devices list; exit 0; fi

if [ "${1:-}" = "--aus" ]; then
  read -rp "Schutz wirklich ausschalten? Dann kann sich wieder jeder PC anmelden. (ja/nein): " a
  [ "$a" = "ja" ] || { echo "Abgebrochen, nichts geändert."; exit 1; }
  set_env DESKTOP_DEVICE_PAIRING "" "PC-Programm nur auf freigeschalteten PCs"
  restart_backend
  echo "Sicherung der alten .env: $BACKUP"
  exit 0
fi

echo
echo "Schutz für das PC-Programm einrichten"
echo "====================================="
echo

# ── 1. Admin password ──
if grep -qE '^ADMIN_DESKTOP_PASSWORD_HASH=' "$ENV_FILE"; then
  read -rp "Es gibt schon ein Admin-Passwort. Ein neues festlegen? (ja/nein): " a
else
  echo "Schritt 1: Neues Admin-Passwort für das PC-Programm."
  echo "Das alte Passwort steht öffentlich im Programmcode und gilt danach nicht mehr."
  a=ja
fi
if [ "$a" = "ja" ]; then
  while true; do
    read -rsp "Neues Admin-Passwort (mindestens 10 Zeichen, wird nicht angezeigt): " PW1; echo
    read -rsp "Noch einmal zur Kontrolle: " PW2; echo
    if [ "$PW1" != "$PW2" ]; then echo "Die beiden Eingaben sind verschieden. Bitte noch einmal."; continue; fi
    if [ "${#PW1}" -lt 10 ]; then echo "Zu kurz. Bitte mindestens 10 Zeichen."; continue; fi
    break
  done
  HASH=$(printf '%s' "$PW1" | devices hash-password) || { echo "Hash fehlgeschlagen, nichts geändert."; exit 1; }
  unset PW1 PW2
  # Only the hash line itself may end up in the .env (no log lines in front of it)
  HASH=$(printf '%s\n' "$HASH" | grep -E '^scrypt\$[A-Za-z0-9_-]{16,}\$[A-Za-z0-9_-]{32,}$' | tail -1)
  if [ -z "$HASH" ]; then echo "Hash fehlgeschlagen, nichts geändert."; exit 1; fi
  set_env ADMIN_DESKTOP_PASSWORD "" "Admin-Passwort PC-Programm alt"
  set_env ADMIN_DESKTOP_PASSWORD_HASH "$HASH" "Admin-Passwort PC-Programm"
  unset HASH
  echo "Admin-Passwort gespeichert (nur als Hash)."
  NEED_RESTART=1
fi
echo

# ── 2. Pairing codes ──
echo "Schritt 2: Kopplungscodes für die Firmen-PCs."
devices list
echo
read -rp "Für wie viele PCs sollen jetzt Codes erstellt werden? (0 = keine): " N
if [[ "$N" =~ ^[0-9]+$ ]] && [ "$N" -gt 0 ]; then
  CODES=()
  for i in $(seq 1 "$N"); do
    read -rp "Name von PC $i (z. B. Werkstatt, Kasse 1): " NAME
    LINE=$(devices code "${NAME:-PC $i}") || { echo "Code konnte nicht erstellt werden."; exit 1; }
    CODES+=("$LINE")
  done
  echo
  echo "Die Codes (bitte notieren, sie werden nur jetzt angezeigt):"
  printf '  %s\n' "${CODES[@]}"
  echo
  echo "An jedem PC: PC-Programm (WilkenPoelker) ganz schließen und neu öffnen, damit es die"
  echo "neue Version lädt. Dann abmelden, unten \"Diesen PC mit einem Kopplungscode freischalten\""
  echo "anklicken und den Code eingeben. Ein Code gilt nur für einen PC."
fi
echo

# ── 3. Check ──
while true; do
  read -rp "Enter drücken, um zu sehen, welche PCs schon freigeschaltet sind ... " _
  devices list
  echo
  read -rp "Sind alle PCs freigeschaltet, die das Programm brauchen? (ja/nein): " a
  [ "$a" = "ja" ] && break
  echo "Dann bitte jetzt an den übrigen PCs den Code eingeben."
done
echo

# ── 4. Switch on ──
echo "Schritt 4: Schutz einschalten."
echo "Danach können sich nur noch die freigeschalteten PCs anmelden. Ein PC, der nicht"
echo "freigeschaltet ist, verliert spätestens nach 15 Minuten die Verbindung."
read -rp "Schutz jetzt einschalten? (ja/nein): " a
if [ "$a" = "ja" ]; then
  set_env DESKTOP_DEVICE_PAIRING "on" "PC-Programm nur auf freigeschalteten PCs"
  NEED_RESTART=1
else
  echo "Der Schutz bleibt aus. Später einschalten: dieses Skript noch einmal starten."
fi

if [ "${NEED_RESTART:-0}" = 1 ]; then restart_backend; fi
[ -n "$BACKUP" ] && echo "Sicherung der alten .env: $BACKUP"
echo "Notfall (Schutz wieder aus): bash /root/pc-schutz-einrichten.sh --aus"
