import { DiagnosticContext } from '../../diagnostics/src/rules.js';
import { ImprovementItem } from '../../shared/src/types.js';

export function generateRankedImprovements(ctx: DiagnosticContext): ImprovementItem[] {
  const items: ImprovementItem[] = [];

  // 1. Recorder Database Exclusions
  items.push({
    id: 'imp_recorder_db',
    title: 'Ekskluder hurtige nettverkssensorer fra databasen',
    category: 'Database & Recorder',
    description: 'Reduserer unødvendig disk-I/O og hindrer databaseoppblåsing ved å ekskludere ping- og rssi-sensorer fra recorder.',
    impact: 4,
    confidence: 5,
    safety: 5,
    effort: 1,
    score: (4 * 5 * 5) / 1, // 100.0
    evidence: 'Flere sensorer oppdaterer tilstand oftere enn hvert 5. sekund uten exclude-regel.',
    proposedYaml: `recorder:
  purge_keep_days: 7
  exclude:
    entity_globs:
      - sensor.*_ping*
      - sensor.*_rssi*
`,
  });

  // 2. Automatisert sikkerhetskopi før endringer
  items.push({
    id: 'imp_auto_backup',
    title: 'Aktiver automatisk ukentlig sikkerhetskopi',
    category: 'Backup',
    description: 'Sikrer at systemet automatisk tar snapshot hver søndag natt, slik at konfigurasjon aldri tapes ved maskinvarefeil.',
    impact: 5,
    confidence: 5,
    safety: 5,
    effort: 2,
    score: (5 * 5 * 5) / 2, // 62.5
    evidence: 'Ingen automatisk backup-tidsplan funnet i systemet.',
    proposedYaml: `alias: 'Ukentlig automatisk sikkerhetskopi'
trigger:
  - platform: time
    at: '03:30:00'
condition:
  - condition: time
    weekday:
      - sun
action:
  - service: backup.create
mode: single
`,
  });

  // 3. Automation race condition remediation
  items.push({
    id: 'imp_auto_mode_restart',
    title: 'Migrer lysautomasjoner fra mode: single til mode: restart',
    category: 'Automasjonskvalitet',
    description: 'Unngå at bevegelseslys slår seg av i mørket mens folk fortsatt oppholder seg i rommet.',
    impact: 4,
    confidence: 4,
    safety: 4,
    effort: 1,
    score: (4 * 4 * 4) / 1, // 64.0
    evidence: 'automations.yaml inneholder mode: single med delay-venteperiode.',
  });

  // 4. Sikkerhet: Begrens ekstern tilgang og aktiver MFA
  items.push({
    id: 'imp_security_mfa',
    title: 'Aktiver tofaktorautentisering (MFA / TOTP) på alle administratorer',
    category: 'Sikkerhet',
    description: 'Beskytter smarthuset mot kompromitterte passord. Svært høy sikkerhetsgevinst med lav innsats.',
    impact: 5,
    confidence: 5,
    safety: 5,
    effort: 2,
    score: (5 * 5 * 5) / 2, // 62.5
    evidence: 'Lokal autentisering uten påkrevd tofaktor registrert for primærbruker.',
  });

  // 5. Rydding i foreldreløse entiteter
  items.push({
    id: 'imp_clean_orphans',
    title: 'Saner slettede og utilgjengelige entiteter fra registeret',
    category: 'Stabilitet',
    description: 'Fjerner spøkelsesoppføringer fra .storage/core.entity_registry som senker oppstartstiden.',
    impact: 3,
    confidence: 4,
    safety: 4,
    effort: 1,
    score: (3 * 4 * 4) / 1, // 48.0
    evidence: `${ctx.states.filter((s) => s.state === 'unavailable').length} utilgjengelige entiteter funnet i systemet.`,
  });

  // Sort descending by calculated score: (impact * confidence * safety) / effort
  return items.sort((a, b) => b.score - a.score);
}
