# HA Engineering Console

Lokal-first ingeniørkonsoll for diagnostisering, konfigurering, optimalisering og trygg administrasjon av Home Assistant.

## Nøkkelfunksjoner

- **Connection Center:**
  - Full støtte for både live Home Assistant (REST API & WebSocket) og forhåndsdefinerte laboratorieprofiler (Home Assistant Green, CasaOS Container, Raspberry Pi 4 Core, Home Assistant Yellow Matter).
  - Automatisk deteksjon av installasjonstype og kapabilitetsmatrise (Supervisor, Backups, Shell, Zigbee, Z-Wave, Hardware Telemetri).
  - TLS-analyse med advarsel ved usikker HTTP-overføring over eksterne nettverk.
  - Sikker, obfuskert lokal lagring av autentiseringstokens i nettleseren.

- **System Doctor:**
  - Evidensbasert analyse av kjerne, operativsystem, maskinvare og sensorer.
  - Ingen funn uten konkret evidens (nøyaktig sensorverdi, tidsstempel eller logglinje).
  - Detekterer:
    - Kritisk lavt batterinivå (< 15%) med nøyaktig prosent og enhetsmodell
    - Utilgjengelige og "flappende" entiteter
    - Foreldreløse entiteter i registeret
    - Databaseoppblåsing og overdreven SQLite-slitasje fra høytfrekvente sensorer (ping, rssi)
    - Døde automasjonstriggere og ubeskyttede `mode: single` venteløkker (race conditions)
    - Enheter uten tildelt rom/område og upresise fabrikknavn
    - Manglende sikkerhetskopi og sikkerhetshull (f.eks. manglende vannlekkasjesensorer i våtrom)

- **Configuration Studio:**
  - Avansert syntaks- og skjemavalidering for Home Assistant YAML (`configuration.yaml`, `automations.yaml`, `scripts.yaml`).
  - Umiddelbar feilvisning med linjenummer, kolonne og feltforklaring.
  - Linje-for-linje diff-visning mot opprinnelig konfigurasjon.
  - Maskering av sensitive data (secrets, passord, tokens, GPS-koordinater).
  - Naturlig språk-til-YAML generator for smarthusautomasjoner.
  - Eksport av YAML uten skriving til Home Assistant før eksplisitt godkjenning.

- **Safe Action Center & Atomic Rollback:**
  - Firedelt sikkerhetsmodell: `READ_ONLY` (standard), `PROPOSE`, `APPLY_SAFE`, `ADVANCED`.
  - Eksplisitt to-trinns godkjenning for alle skriveoperasjoner.
  - Automatisk sikkerhetskopi/snapshot før hver endring.
  - 1-klikk tilbakerulling (rollback) av tidligere endringer.

- **Device Advisor & Improvement Engine:**
  - Behovsbasert maskinvarerådgivning basert på konkrete sikkerhetshull i hjemmet.
  - Prioritering av smarthustiltak etter formelen: `Score = (Effekt × Konfidens × Sikkerhet) ÷ Innsats`.

- **Sanntids Event Stream & Sanitert Rapport:**
  - Live Server-Sent Events (SSE) strøm av tilstandsendringer og servicekall.
  - Eksport av diagnostisk rapport i Markdown eller JSON, med automatisk fjerning av tokens, passord og private personidentifikatorer.

---

## Oppstart og Kjøring

### 1. Start applikasjonen (Full-stack):
```bash
npm run dev
```
Konsollen starter på `http://localhost:3000` og kjører både Express backend-API og Vite React frontend i samme prosess.

### 2. Kjøring av automatiserte tester:
```bash
npm test
```
Kjører den innebygde testsuiten som verifiserer tilkobling, diagnostiske regler, YAML-validering, diff-beregning, sikkerhetssensur og rollback.

### 3. Typekontroll og Lint:
```bash
npm run lint
```

---

## Arkitektur

Prosjektet er organisert i en ren monorepo-struktur:

```text
├── packages/
│   ├── shared/                # Delte datatyper, grensesnitt og sensurverktøy
│   ├── ha-client/             # Home Assistant REST-klient, TLS-sjekk og mock-adaptere
│   ├── diagnostics/           # 11 evidensbaserte system doctor-regler
│   ├── config-engine/         # YAML-parser, skjemavalidering, diff-motor og safe executor
│   ├── recommendation-engine/ # Prioriteringsformel og smarthusforbedringer
│   └── device-advisor/        # Behovsdrevet maskinvarerådgivning
├── src/                       # React frontend med Engineering Console UI
│   ├── components/            # Gjenbrukbare og tilgjengelige grensesnittkomponenter
│   └── services/              # API-klient mot backend
├── server.ts                  # Express full-stack API server med Vite middleware
└── tests/                     # Omfattende enhets- og integrasjonstester
```

---

## Sikkerhetsmodell

1. **READ_ONLY:** Standardmodus. Tillater kun inspeksjon av tilstander, telemetri, logger og entiteter.
2. **PROPOSE:** Genererer forslag, beregner diff og risiko, men gjør ingen endringer.
3. **APPLY_SAFE:** Krever to-trinns bekreftelse fra bruker, utfører automatisk validering og tar backup før skriving.
4. **ADVANCED:** Reservert for kjerneomstart og destruktive handlinger. Utføres aldri automatisk.


## Publication boundary

This repository is a technical portfolio demonstration. The default security mode is read-only and write operations require explicit user confirmation. The project does not claim that a configured Home Assistant instance, hardware environment or external deployment has been verified merely because connection profiles or configuration templates exist.

Use synthetic or non-sensitive demonstration data when publishing screenshots, logs or reports. Never commit Home Assistant tokens, passwords, private URLs, GPS coordinates or personal data.

## Verification

The publication CI workflow runs:

```bash
npm install
npm run lint
npm test
npm run build
```

External Home Assistant integration is not required for the static CI verification.
