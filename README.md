# SPFH CMS – Backend

REST-API für ein Dokumentationssystem der **Sozialpädagogischen Familienhilfe (SPFH)**.
Fachkräfte dokumentieren ihre Termine, Berichte und Hilfepläne pro Familie; Admins
verwalten Zuweisungen und sehen die Auslastung über alle Fachkräfte hinweg.

## Stack

- **Node.js + Express** mit TypeScript
- **MongoDB** + Mongoose
- **JWT** (Access + Refresh) mit Rotation & Reuse-Detection, Refresh-Token als httpOnly-Cookie
- **Zod** für Runtime-Validierung aller Request-Bodies
- **AWS S3** mit Presigned URLs für Dokumenten-Uploads (PDF/DOCX)

## Struktur

Layer-basiert (nicht feature-basiert) — jede Ebene als eigener Ordner mit Barrel-Exports:

```
src/
  config/        DB-Verbindung
  models/        Mongoose-Schemas (User, Client, Appointment, Document, Hilfeplan, RefreshToken)
  schemas/       Zod-Validierungs-Schemas
  controllers/   Request-Handler (auth, client, appointment, document, stats, hilfeplan, user)
  routes/        Express-Router, alles unter /api/v1
  middlewares/   protect, adminOnly, validateBody, errorHandler
  services/      S3-Wrapper
  utils/         Klient-Zugriffsprüfung
  scripts/       seed.ts (Demo-Daten)
```

Path-Aliases (`#models`, `#schemas`, …) via `package.json#imports`.

## Domänen-Kernpunkte

- **Rollen**: `admin` oder `fachkraft`. Klienten können im **Tandem** betreut werden.
- **Stundenauswertung**: durchgeführte Termine der ISO-Woche werden gegen das wöchentliche
  Kontingent (`weeklyHoursQuota`) gehalten; Admin-Dashboard zeigt die Auslastung pro FK.
- **Berichte**: jeder durchgeführte Termin braucht einen Report; Sentinel `'-'` markiert
  „ausstehend" und wird als überfällig gewertet.

## Lokal starten

```bash
npm install
cp .env.example .env   # MONGO_URI, JWT_*_SECRET, CLIENT_URL setzen
npm run seed           # Demo-Daten (1 Admin, 5 Fachkräfte, 20 Klienten)
npm run dev
```

Login (Seed): `admin@spfh.de` / `admin1234` oder `a.berger@spfh.de` / `fk12345`.
