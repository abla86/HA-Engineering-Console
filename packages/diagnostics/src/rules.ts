import { Finding, HAArea, HADevice, HAIntegration, HAState, InstallationType, SystemHealth } from '../../shared/src/types.js';

export interface DiagnosticContext {
  states: HAState[];
  devices: HADevice[];
  areas: HAArea[];
  integrations: HAIntegration[];
  health: SystemHealth;
  automationsYaml?: string;
  configYaml?: string;
  installationType: InstallationType;
}

export function runAllDiagnostics(ctx: DiagnosticContext): Finding[] {
  const findings: Finding[] = [];

  // Rule 1: Critically Low Battery (< 15%)
  checkLowBattery(ctx, findings);

  // Rule 2: Unavailable & Flapping Entities
  checkUnavailableEntities(ctx, findings);

  // Rule 3: Orphaned Entities (state restored or marked orphan)
  checkOrphanedEntities(ctx, findings);

  // Rule 4: High-Frequency Recorder DB Flooding
  checkRecorderBloat(ctx, findings);

  // Rule 5: Dead Automation Triggers
  checkDeadAutomations(ctx, findings);

  // Rule 6: Automation Concurrency Race (mode: single with long delay)
  checkAutomationRaceCondition(ctx, findings);

  // Rule 7: Devices Missing Area Assignment
  checkDevicesMissingArea(ctx, findings);

  // Rule 8: Integration Setup Failures
  checkIntegrationFailures(ctx, findings);

  // Rule 9: Backup Overdue or Missing
  checkBackupStatus(ctx, findings);

  // Rule 10: Generic Unfriendly Device Naming
  checkGenericNaming(ctx, findings);

  // Rule 11: Safety Gap (Missing leak / smoke sensors)
  checkSafetyCoverage(ctx, findings);

  return findings;
}

function checkLowBattery(ctx: DiagnosticContext, findings: Finding[]) {
  for (const st of ctx.states) {
    const isBatterySensor =
      st.attributes.device_class === 'battery' ||
      st.entity_id.includes('battery') ||
      st.entity_id.endsWith('_bat');

    if (isBatterySensor && st.state !== 'unavailable' && st.state !== 'unknown') {
      const val = parseFloat(st.state);
      if (!isNaN(val) && val < 15) {
        findings.push({
          id: `crit_battery_${st.entity_id}`,
          title: `Kritisk lavt batteri (${val}%) på ${st.attributes.friendly_name || st.entity_id}`,
          severity: val < 10 ? 'critical' : 'warning',
          confidence: 100,
          evidence: `Tilstand rapportert: ${st.state}${st.attributes.unit_of_measurement || '%'} kl. ${st.last_updated}`,
          affectedObjects: [st.entity_id],
          explanation: `Sensoren har ${val}% gjenværende strøm og kan falle ut av mesh-nettverket når som helst, noe som vil føre til tap av automasjonstriggere.`,
          proposedFix: 'Bytt batteri (vanligvis CR2032 eller CR2450) og bekreft at LQI/batteristatus gjenopprettes.',
          risk: 'none',
          reversible: true,
          verificationMethod: `Overvåk at ${st.entity_id} rapporterer over 80% etter batteribytte.`,
          category: 'entities',
        });
      }
    }
  }
}

function checkUnavailableEntities(ctx: DiagnosticContext, findings: Finding[]) {
  const unavail = ctx.states.filter((s) => s.state === 'unavailable' || s.state === 'unknown');
  for (const st of unavail) {
    // Exclude deliberate templates
    findings.push({
      id: `unavail_${st.entity_id}`,
      title: `Entitet er utilgjengelig: ${st.entity_id}`,
      severity: 'warning',
      confidence: 95,
      evidence: `Entity '${st.entity_id}' har tilstand '${st.state}' (sist endret: ${st.last_changed})`,
      affectedObjects: [st.entity_id],
      explanation: `Enheten har stoppet å rapportere til Home Assistant. Dette skyldes ofte strømbrudd, rekkeviddefeil i radio (Zigbee/Z-Wave) eller slettede integrasjoner.`,
      proposedFix: 'Undersøk strømforsyning, vekk enheten eller fjern den fra Home Assistant dersom den er tatt ut av drift.',
      risk: 'none',
      reversible: true,
      verificationMethod: 'Verifiser at enhetens state skifter til en gyldig verdi i developer tools.',
      category: 'entities',
    });
  }
}

function checkOrphanedEntities(ctx: DiagnosticContext, findings: Finding[]) {
  for (const st of ctx.states) {
    if (st.attributes.restored === true && st.state === 'unavailable') {
      findings.push({
        id: `orphan_${st.entity_id}`,
        title: `Foreldreløs gjenopprettet entitet: ${st.entity_id}`,
        severity: 'warning',
        confidence: 90,
        evidence: `Attributt 'restored: true' oppdaget mens integrasjonen ikke lenger eksisterer aktivt`,
        affectedObjects: [st.entity_id],
        explanation: `Denne entiteten finnes fortsatt i .storage/core.entity_registry, men tilhørende maskinvare eller integrasjon er frakoblet eller avinstallert.`,
        proposedFix: `Fjern den foreldreløse oppføringen fra entitetsregisteret under Innstillinger -> Enheter og tjenester -> Entiteter.`,
        risk: 'low',
        reversible: true,
        verificationMethod: 'Sjekk at entiteten ikke lenger listes under states.',
        category: 'entities',
      });
    }
  }
}

function checkRecorderBloat(ctx: DiagnosticContext, findings: Finding[]) {
  // Check if high frequency sensors exist and if configuration.yaml lacks exclude filters
  const highFreqSensors = ctx.states.filter((s) => {
    const id = s.entity_id;
    return id.includes('ping') || id.includes('rssi') || id.includes('cpu_percent') || id.includes('power_hourly');
  });

  if (highFreqSensors.length > 0 && ctx.configYaml && !ctx.configYaml.includes('exclude:')) {
    findings.push({
      id: 'recorder_db_bloat',
      title: 'Manglende filtrering i recorder forårsaker databasevekst',
      severity: 'warning',
      confidence: 85,
      evidence: `${highFreqSensors.length} høytfrekvente sensorer (f.eks. ${highFreqSensors.map((s) => s.entity_id).slice(0, 3).join(', ')}) logges uten exclude-filter i recorder.`,
      affectedObjects: highFreqSensors.map((s) => s.entity_id),
      explanation: `Hvert eneste millisekund eller sekund disse sensorene oppdateres, skrives en ny rad til home-assistant_v2.db. Dette fører til unødvendig slitasje på lagringsmediet (spesielt SD-kort / eMMC) og treg oppstart.`,
      proposedFix: `Legg til exclude-blokk under recorder i configuration.yaml for å ekskludere hyppige nettverkssensorer.`,
      risk: 'low',
      reversible: true,
      verificationMethod: 'Kjør config check og bekreft at databasestørrelse stabiliserer seg.',
      category: 'recorder',
      affectedFile: 'configuration.yaml',
      suggestedPatchYaml: `recorder:
  purge_keep_days: 7
  exclude:
    entities:
${highFreqSensors.map((s) => `      - ${s.entity_id}`).join('\n')}
`,
    });
  }
}

function checkDeadAutomations(ctx: DiagnosticContext, findings: Finding[]) {
  if (!ctx.automationsYaml) return;

  const unavailableIds = new Set(
    ctx.states.filter((s) => s.state === 'unavailable' || s.state === 'unknown').map((s) => s.entity_id)
  );

  for (const deadId of unavailableIds) {
    if (ctx.automationsYaml.includes(deadId)) {
      findings.push({
        id: `dead_auto_${deadId}`,
        title: `Automasjon refererer til utilgjengelig eller slettet entitet (${deadId})`,
        severity: 'critical',
        confidence: 95,
        evidence: `Automations.yaml inneholder referanse til '${deadId}', som for øyeblikket er utilgjengelig.`,
        affectedObjects: [deadId, 'automations.yaml'],
        explanation: `Automasjoner som lytter på utilgjengelige entiteter vil aldri trigge eller kan kaste feil under evaluering av betingelser.`,
        proposedFix: `Oppdater automasjonens trigger/condition til en aktiv sensor, eller fjern utdatert regel.`,
        risk: 'medium',
        reversible: true,
        verificationMethod: 'Kjør automasjonsvalidering og test trigger manuelt.',
        category: 'automation',
        affectedFile: 'automations.yaml',
      });
    }
  }
}

function checkAutomationRaceCondition(ctx: DiagnosticContext, findings: Finding[]) {
  if (!ctx.automationsYaml) return;

  if (ctx.automationsYaml.includes('mode: single') && ctx.automationsYaml.includes('delay:')) {
    findings.push({
      id: 'automation_mode_single_delay',
      title: 'Risiko for blokkerte hendelser: mode: single kombinert med delay',
      severity: 'warning',
      confidence: 88,
      evidence: `automations.yaml inneholder 'mode: single' i kombinasjon med 'delay:'`,
      affectedObjects: ['automations.yaml'],
      explanation: `Når en automasjon med 'mode: single' står og venter i en delay-periode, vil alle nye triggere bli forkastet uten advarsel. Vurder 'mode: restart' eller 'mode: queued'.`,
      proposedFix: `Bytt execution mode til 'restart' hvis nyeste hendelse skal gjelde, eller bruk en timer-hjelper i stedet for fast delay.`,
      risk: 'low',
      reversible: true,
      verificationMethod: 'Verifiser at automasjonen ikke logger "Already running" i systemloggen.',
      category: 'automation',
      affectedFile: 'automations.yaml',
      suggestedPatchYaml: `# Endre fra 'mode: single' til 'mode: restart' for å unngå forkastede triggere:
mode: restart
max_exceeded: silent
`,
    });
  }
}

function checkDevicesMissingArea(ctx: DiagnosticContext, findings: Finding[]) {
  const unassigned = ctx.devices.filter((d) => !d.area_id && d.protocol !== 'virtual');
  if (unassigned.length > 0) {
    findings.push({
      id: 'devices_missing_area',
      title: `${unassigned.length} enheter mangler tildelt rom/område`,
      severity: 'improvement',
      confidence: 100,
      evidence: `Følgende enheter har area_id = null: ${unassigned.map((d) => d.name).join(', ')}`,
      affectedObjects: unassigned.map((d) => d.id),
      explanation: `Enheter uten område gjør det vanskelig å bruke områdebaserte automasjoner (f.eks. "slå av alt lys i stuen") og gir et rotete dashbord i Home Assistant.`,
      proposedFix: 'Gå til Enheter og tjenester og tilordne hvert apparat til riktig rom.',
      risk: 'none',
      reversible: true,
      verificationMethod: 'Kontroller at alle enheter har et definert rom.',
      category: 'system',
    });
  }
}

function checkIntegrationFailures(ctx: DiagnosticContext, findings: Finding[]) {
  for (const integ of ctx.integrations) {
    if (integ.state === 'setup_error' || integ.state === 'setup_retry') {
      findings.push({
        id: `integ_err_${integ.domain}`,
        title: `Integrasjon feilet under oppstart: ${integ.title} (${integ.domain})`,
        severity: 'critical',
        confidence: 100,
        evidence: `Integrasjonstilstand: ${integ.state}`,
        affectedObjects: [integ.domain],
        explanation: `Integrasjonen kunne ikke initialisere. Dette skyldes vanligvis utløpt autentiseringstoken, endret nettverks-IP eller manglende internettilgang.`,
        proposedFix: `Sjekk systemloggen for detaljert feilmelding og reautentiser integrasjonen.`,
        risk: 'medium',
        reversible: true,
        verificationMethod: 'Trykk "Last inn på nytt" på integrasjonen i Home Assistant.',
        category: 'security',
      });
    }
  }
}

function checkBackupStatus(ctx: DiagnosticContext, findings: Finding[]) {
  if (!ctx.health.lastBackupDate) {
    findings.push({
      id: 'backup_none_found',
      title: 'Ingen sikkerhetskopi funnet for installasjonen',
      severity: 'critical',
      confidence: 90,
      evidence: `lastBackupDate = null. Ingen registrert backup i systemet.`,
      affectedObjects: ['system.backup'],
      explanation: `Uten en oppdatert sikkerhetskopi er hele smarthuskonfigurasjonen, automasjoner og historikk sårbar for lagringsfeil eller defekt oppdatering.`,
      proposedFix: 'Opprett en full sikkerhetskopi umiddelbart og konfigurer automatisk ukentlig backup.',
      risk: 'high',
      reversible: false,
      verificationMethod: 'Bekreft at backup-arkiv (.tar) er opprettet og kan lastes ned.',
      category: 'backup',
    });
  } else {
    const daysSince = (Date.now() - new Date(ctx.health.lastBackupDate).getTime()) / (1000 * 3600 * 24);
    if (daysSince > 7) {
      findings.push({
        id: 'backup_overdue',
        title: `Sikkerhetskopi er utdatert (${Math.floor(daysSince)} dager siden forrige backup)`,
        severity: 'warning',
        confidence: 95,
        evidence: `Siste registrerte backup: ${ctx.health.lastBackupDate}`,
        affectedObjects: ['system.backup'],
        explanation: 'En god tommelfingerregel er å ha automatisk ukentlig backup, samt backup før hver Core-oppdatering.',
        proposedFix: 'Kjør en ny backup før du foretar konfigurasjonsendringer.',
        risk: 'medium',
        reversible: true,
        verificationMethod: 'Sjekk at ny backup er fullført.',
        category: 'backup',
      });
    }
  }
}

function checkGenericNaming(ctx: DiagnosticContext, findings: Finding[]) {
  const genericDevices = ctx.devices.filter(
    (d) =>
      d.name.toLowerCase().includes('bulb') ||
      d.name.toLowerCase().includes('plug') ||
      d.name.toLowerCase().includes('switch') ||
      /e27|gu10|cws|tradfri\s+bulb/i.test(d.name)
  );

  if (genericDevices.length > 0) {
    findings.push({
      id: 'generic_device_names',
      title: `${genericDevices.length} enheter har upresise standardnavn`,
      severity: 'improvement',
      confidence: 85,
      evidence: `Enheter med standardnavn: ${genericDevices.map((d) => d.name).join(', ')}`,
      affectedObjects: genericDevices.map((d) => d.id),
      explanation: `Standardnavn fra produsenten (f.eks. "TRADFRI bulb E27...") gjør det vanskelig å navigere i entitetslisten og feilsøke automasjoner.`,
      proposedFix: 'Gi enhetene beskrivende navn som inkluderer plassering og funksjon (f.eks. "Stue Hjørnelampe").',
      risk: 'none',
      reversible: true,
      verificationMethod: 'Verifiser at enhetene har fått menneskelesbare navn.',
      category: 'system',
    });
  }
}

function checkSafetyCoverage(ctx: DiagnosticContext, findings: Finding[]) {
  // Check if kitchen or bathroom lacks moisture/water leak detector
  const wetAreas = ctx.areas.filter((a) => a.area_id === 'kitchen' || a.area_id === 'bathroom');
  const moistureSensors = ctx.states.filter((s) => s.attributes.device_class === 'moisture' || s.entity_id.includes('leak') || s.entity_id.includes('water'));

  if (wetAreas.length > 0 && moistureSensors.length === 0) {
    findings.push({
      id: 'missing_water_leak_sensors',
      title: 'Manglende vannlekkasjedeteksjon i våtrom og kjøkken',
      severity: 'improvement',
      confidence: 80,
      evidence: `Ingen entiteter med device_class 'moisture' registrert for ${wetAreas.map((a) => a.name).join(' eller ')}.`,
      affectedObjects: wetAreas.map((a) => a.area_id),
      explanation: `Vannlekkasjer under oppvaskmaskin eller ved varmtvannsbereder kan forårsake store skader før de oppdages visuelt. En enkel lokal Zigbee-sensor gir umiddelbar varsling.`,
      proposedFix: 'Installer en lokal Zigbee vannlekkasjesensor under oppvaskmaskin og ved fordelerskap.',
      risk: 'none',
      reversible: true,
      verificationMethod: 'Bekreft at ny binary_sensor med device_class: moisture rapporterer i Home Assistant.',
      category: 'security',
    });
  }
}
