#!/usr/bin/env bash
# Google-Bewertungen auf der Website einrichten.
# Auf dem App-Server als root:  bash /root/website-google-einrichten.sh
#
# Fragt den API-Schlüssel ab (wird nicht angezeigt), prüft ihn direkt bei
# Google, merkt sich die Place-ID des Geschäfts und trägt beides in die .env
# des Backends ein (vorher wird sie gesichert). Die Bewertungen selbst werden
# nie gespeichert, sondern bei jedem Aufruf frisch von Google geholt
# (höchstens 900 Abrufe im Monat, damit es kostenlos bleibt).
set -uo pipefail

APP=/apps/wpapp/backend
ENV_FILE="$APP/.env"
QUERY='Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn'

if [ "$(id -u)" != 0 ]; then echo "Bitte als root ausführen."; exit 1; fi
if [ ! -f "$ENV_FILE" ]; then echo "$ENV_FILE fehlt."; exit 1; fi
cd "$APP" || exit 1
PORT=$(grep -E '^PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2 | tr -d "'\"[:space:]")
PORT=${PORT:-5000}

echo
echo "Google-Bewertungen einrichten"
echo "============================="
echo "Gebraucht wird ein API-Schlüssel aus der Google Cloud Console:"
echo "  - \"Places API (New)\" aktiviert"
echo "  - Schlüssel eingeschränkt auf: API \"Places API (New)\" und die IP-Adresse dieses Servers"
echo
read -rsp "API-Schlüssel (wird nicht angezeigt): " KEY; echo
KEY=$(printf '%s' "$KEY" | tr -d '[:space:]')
if ! [[ $KEY =~ ^AIza[0-9A-Za-z_-]{35}$ ]]; then
  echo "Das sieht nicht wie ein Google-API-Schlüssel aus (beginnt mit AIza, 39 Zeichen). Nichts geändert."
  exit 1
fi

echo "Frage Google nach dem Geschäft ..."
# Der Schlüssel geht als Kopfzeile aus einer Datei mit, nicht als Befehlszeile
RESP=$(curl -sS --max-time 20 -X POST 'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H @<(printf 'X-Goog-Api-Key: %s\n' "$KEY") \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress' \
  --data "{\"textQuery\": \"$QUERY\", \"languageCode\": \"de\"}" 2>&1)
PLACE=$(printf '%s' "$RESP" | node -e '
  let s = "";
  process.stdin.on("data", (d) => { s += d; }).on("end", () => {
    let j;
    try { j = JSON.parse(s); } catch { console.error(`Keine verständliche Antwort von Google: ${s.slice(0, 200)}`); process.exit(1); }
    if (j.error) { console.error(`Google meldet: ${j.error.message || j.error.status}`); process.exit(1); }
    const p = (j.places || [])[0];
    if (!p) { console.error("Google hat das Geschäft nicht gefunden."); process.exit(1); }
    console.error(`Gefunden: ${p.displayName ? p.displayName.text : "?"}, ${p.formattedAddress || ""}`);
    console.log(p.id);
  });
') || { echo "Nichts geändert."; exit 1; }

read -rp "Ist das das richtige Geschäft? (ja/nein): " answer
if [ "$answer" != "ja" ]; then echo "Abgebrochen, nichts geändert."; exit 1; fi

BACKUP="$ENV_FILE.vor-google-$(date +%Y%m%d-%H%M%S)"
cp -p "$ENV_FILE" "$BACKUP" || { echo "Sicherung der .env fehlgeschlagen. Nichts geändert."; exit 1; }
TMP=$(mktemp)
grep -vE "^(GOOGLE_PLACES_API_KEY|GOOGLE_PLACE_ID)=|^# Google-Bewertungen auf der Website" "$ENV_FILE" > "$TMP"
{
  printf '%s\n' "# Google-Bewertungen auf der Website (eingerichtet am $(date +%d.%m.%Y) mit website-google-einrichten.sh)"
  printf "GOOGLE_PLACES_API_KEY='%s'\n" "$KEY"
  printf "GOOGLE_PLACE_ID='%s'\n" "$PLACE"
} >> "$TMP"
cat "$TMP" > "$ENV_FILE"
rm -f "$TMP"
unset KEY

pm2 restart wpapp-backend --update-env > /dev/null && pm2 save > /dev/null
echo "Gespeichert und Backend neu gestartet (Sicherung der alten .env: $BACKUP)."
echo "Teste die Bewertungen über das Backend ..."
for _ in $(seq 1 20); do
  sleep 3
  OUT=$(curl -s --max-time 20 "http://127.0.0.1:$PORT/api/website/reviews") && [ -n "$OUT" ] && break
done
printf '%s' "${OUT:-}" | node -e '
  let s = "";
  process.stdin.on("data", (d) => { s += d; }).on("end", () => {
    let d = {};
    try { d = JSON.parse(s).data || {}; } catch { console.log("Das Backend antwortet noch nicht, bitte gleich auf der Website nachsehen."); return; }
    if (d.available) console.log(`Klappt: ${String(d.rating).replace(".", ",")} von 5 Sternen bei ${d.count} Bewertungen. Die Website zeigt sie ab sofort.`);
    else console.log(`Noch keine Bewertungen (${d.reason || "unbekannt"}). Hinweise stehen im Backend-Log: pm2 logs wpapp-backend --lines 50`);
  });
'
