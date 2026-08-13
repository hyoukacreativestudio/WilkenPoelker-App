# WilkenPoelker – PC-Programm (Firmen-Tool)

Ein eigenständiges Web-Programm für die Firmen-PCs. Es nutzt **dasselbe Backend
und dieselbe Datenbank** wie die Handy-App – mehrere PCs gleichzeitig, kein
Datenchaos. Die App wird dadurch **nicht** verändert.

## Starten – funktioniert auf JEDEM PC (kein Node, keine Installation)
Das Backend liefert das Programm selbst aus. Einfach im Browser öffnen:

> **https://api.wilkenpoelker.de/pc/**

Auf dem Desktop liegt dafür die Verknüpfung **„WilkenPoelker PC-Programm"** –
Doppelklick genügt. Auf weiteren PCs einfach dieselbe URL als Lesezeichen /
Verknüpfung anlegen.

## Anmeldung (per Klick, ohne Passwort)
Abteilung anklicken → sofort drin. Oben links **abmelden / wechseln**. Es sind
nur die Abteilungs-/Manager-Accounts möglich – niemals echte Kundenaccounts.

Die festen Abteilungs-Accounts werden **einmalig per Skript** angelegt (auf dem
Server, im `backend/`-Ordner):
```bash
node scripts/create-desktop-accounts.js
```
Das erstellt/verknüpft (per Rolle, ohne dass Namen/E-Mails passen müssen):

| Abteilung | Account-Name | Rolle |
|---|---|---|
| Admin | Admin Management | admin |
| Fahrrad | Fahrrad Management | bike_manager |
| Reinigungsgeräte | Reinigung Management | cleaning_manager |
| Service | Service Management | service_manager |
| Rasenmäher | Rasenmäher Management | motor_manager |
| Robby | Robby Management | robby_manager |
| Verkauf | Verkauf Management | sales_manager |
| Bestellungen | Bestellungen Management | orders_manager |
| Lager | Lager Management | warehouse_worker |

## Nach Code-Änderungen neu bauen
Das ausgelieferte `dist/` wird mitcommittet. Nach Änderungen:
```bash
cd desktop
VITE_BASE=/pc/ npm run build   # Windows: set VITE_BASE=/pc/ && npm run build
```
Dann committen + Backend redeployen – fertig, alle PCs haben den neuen Stand.

## Lokal entwickeln
```bash
cd desktop
npm install
npm run dev   # http://localhost:5180 (proxyt /api -> lokales Backend)
```

## Sicherheit
Der Klick-Login ist für **vertrauenswürdige Firmen-PCs** gedacht. Optional mit
gemeinsamem Schlüssel härtbar: Server-Umgebungsvariable `DESKTOP_LOGIN_SECRET=…`
setzen; der Client muss denselben Wert senden.
