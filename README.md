# projekt-frontend

[Zur Architektur-Dokumentation](docs/architektur.md)
## Voraussetzungen

- Node.js: `v24.15.0`
- npm: `11.12.1`
- Angular CLI: `21.2.10`
- Das Backend läuft lokal auf `http://localhost:8080`

## Installation

Abhängigkeiten installieren:

```bash
npm ci
```

## Frontend starten

```bash
npm start
```

Das Frontend ist danach unter `http://localhost:4200` erreichbar.

## Entwicklung

Das Frontend verwendet eine lokale Proxy-Konfiguration, damit Aufrufe an `/api` an das Backend weitergeleitet werden.
