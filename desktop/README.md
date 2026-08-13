# WilkenPoelker – PC-Programm (Firmen-Tool)

Ein eigenständiges Web-Programm für die Firmen-PCs. Es nutzt **dasselbe Backend
und dieselbe Datenbank** wie die Handy-App – mehrere PCs gleichzeitig, kein
Datenchaos. Die App wird dadurch **nicht** verändert.

## Anmeldung
Beim Öffnen einfach die **Abteilung anklicken** (kein Passwort). Oben links
jederzeit **abmelden / wechseln**. Es sind nur die Abteilungs-/Manager-Accounts
möglich – niemals echte Kundenaccounts.

Dafür muss je Abteilung **ein Account existieren** (im Admin-Bereich anlegen),
mit diesen E-Mails + Rollen:

| Abteilung | E-Mail | Rolle |
|---|---|---|
| Admin | admin@wilkenpoelker.de | admin |
| Fahrrad | fahrrad@wilkenpoelker.de | bike_manager |
| Reinigungsgeräte | reinigung@wilkenpoelker.de | cleaning_manager |
| Service | service@wilkenpoelker.de | service_manager |
| Rasenmäher | rasenmaeher@wilkenpoelker.de | motor_manager |
| Robby | robby@wilkenpoelker.de | robby_manager |
| Verkauf | verkauf@wilkenpoelker.de | sales_manager |
| Bestellungen | bestellungen@wilkenpoelker.de | orders_manager |
| Lager | lager@wilkenpoelker.de | warehouse_worker |

## Starten (ein PC)
Doppelklick auf **„WilkenPoelker-PC starten.bat"** (liegt auf dem Desktop).
Oder manuell:
```bash
cd desktop
set VITE_PROXY_TARGET=https://api.wilkenpoelker.de   # Windows
npm install        # nur beim ersten Mal
npm run dev        # öffnet http://localhost:5180
```

## Für ALLE Firmen-PCs (empfohlen)
Einmal zentral bauen und im Firmennetz bereitstellen:
```bash
cd desktop
npm install
VITE_API_URL=https://api.wilkenpoelker.de/api npm run build
# dann den Ordner desktop/dist auf einem internen Webserver hosten
```
Alle PCs öffnen dann nur die interne URL im Browser.

## Sicherheit
Der Klick-Login ist für **vertrauenswürdige Firmen-PCs** gedacht. Optional lässt
er sich mit einem gemeinsamen Schlüssel härten: Server-Umgebungsvariable
`DESKTOP_LOGIN_SECRET=…` setzen; dann muss der Client denselben Wert senden.
