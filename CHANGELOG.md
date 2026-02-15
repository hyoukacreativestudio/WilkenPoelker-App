# Changelog

Alle wichtigen Änderungen an der WilkenPoelker App.

## [1.0.0] - 2026-02-14

### Features
- Produktkatalog: Fahrräder, Reinigungsgeräte, Motorgeräte (28 Produkte)
- Reparatur-Tracking mit Taifun-ERP-Simulation (Ampelfarben: Rot/Gelb/Grün)
- Admin-Ansicht: Alle Reparaturen aller Kunden in eigenem Tab
- Terminverwaltung: Buchung, Bestätigung, Absage
- Push-Benachrichtigungen via Firebase Cloud Messaging
- In-App Benachrichtigungssound (Web Audio API + native Channels)
- KI-Chatbot (GPT-4o-mini) - eingeschränkt auf Fachthemen
- Community-Feed mit Posts, Likes, Kommentaren
- FAQ-System (pro Kategorie bearbeitbar)
- Admin-Panel: Nutzerverwaltung, Rollenzuweisung, Audit-Log
- Profilverwaltung mit Avatar-Upload
- Dunkel-/Hell-Modus + Akzentfarben + Textgrößen
- Internationalisierung (Deutsch + Englisch)
- Biometrische Anmeldung (Face ID / Fingerabdruck)

### Sicherheit
- JWT Auth (15min Access + 7d Refresh Token mit Rotation)
- Rate Limiting (200 req/min API, 30 Login/15min)
- Helmet Security Headers
- Input-Sanitization (XSS-Schutz)
- DSGVO: Account-Löschung, Datenschutz-Zustimmung

### Performance
- PostgreSQL mit 20 Performance-Indexes
- Connection Pooling (50 prod / 20 dev)
- Response Compression
- Static File Caching
- Optimiert für 10.000+ Nutzer

### Infrastruktur
- Docker-Setup (Dockerfile + docker-compose.yml)
- GitHub Actions CI/CD
- EAS Build Profiles (dev, preview, production)
- Graceful Shutdown
- Winston Logging mit File Rotation

### Testdaten
- 19 Testnutzer (alle Rollen)
- 10 Reparaturen mit Taifun-Simulation
- 20 Termine für alle Kunden
- 28 Produkte mit realistischen Spezifikationen
