import { DiagnosticContext } from '../../diagnostics/src/rules.js';
import { AdvisorRecommendation } from '../../shared/src/types.js';

export function runDeviceAdvisor(ctx: DiagnosticContext): AdvisorRecommendation[] {
  const recommendations: AdvisorRecommendation[] = [];

  // Check 1: Water leak detection in wet areas
  const hasWaterSensor = ctx.states.some(
    (s) => s.attributes.device_class === 'moisture' || s.entity_id.includes('leak') || s.entity_id.includes('water')
  );
  const wetAreas = ctx.areas.filter((a) => a.area_id === 'kitchen' || a.area_id === 'bathroom');

  if (!hasWaterSensor && wetAreas.length > 0) {
    recommendations.push({
      id: 'adv_water_leak',
      problem: `Dokumentert mangel: Kjøkken og bad mangler overvåking for vannlekkasje fra oppvaskmaskin eller røropplegg.`,
      proposedCategory: 'Lokal Zigbee / Z-Wave vannlekkasjesensor',
      suggestedHardware: 'Standard Zigbee 3.0 vannlekkasjesensor (kategori: fuktsensor med gullbelagte prober)',
      requiredProtocol: 'zigbee',
      localControl: '100% Local (Push)',
      haCompatibility: 'Native (Home Assistant Recommended)',
      coordinatorRequirement: 'Standard Zigbee Coordinator (f.eks. SkyConnect, ConBee II/III eller Sonoff ZBDongle-E)',
      powerType: 'Battery (CR2032/CR2450)',
      privacyImpact: 'Lokal radio, ingen eksterne data',
      recommendedPlacement: 'Plasseres på gulv under sokkel for oppvaskmaskin, samt ved fordelerskap for vann.',
      priority: 'Høy',
      limitations: 'Krever fri sikt eller tilstrekkelig dekning fra Zigbee-mesh. Batteri må kontrolleres årlig.',
    });
  }

  // Check 2: Zigbee Mesh Router if low LQI / edge drops detected
  const zigbeeDevices = ctx.devices.filter((d) => d.protocol === 'zigbee');
  const batteryZigbeeDevices = zigbeeDevices.filter((d) => d.battery_level !== undefined);
  const mainsPoweredZigbee = zigbeeDevices.filter((d) => d.battery_level === undefined);

  if (batteryZigbeeDevices.length > 4 && mainsPoweredZigbee.length < 2) {
    recommendations.push({
      id: 'adv_zigbee_router',
      problem: `Dokumentert mesh-ubalanse: Systemet har ${batteryZigbeeDevices.length} batteridrevne enheter, men bare ${mainsPoweredZigbee.length} nettdrevne routere. Dette gir svakt mesh og risiko for signalbortfall.`,
      proposedCategory: 'Nettdrevet Zigbee 3.0 smartplugg / signalforsterker',
      suggestedHardware: 'Standard Zigbee 3.0 Smartplugg med repeaterfunksjonalitet',
      requiredProtocol: 'zigbee',
      localControl: '100% Local (Push)',
      haCompatibility: 'ZHA / Zigbee2MQTT',
      coordinatorRequirement: 'Eksisterende Zigbee-koordinator',
      powerType: 'Mains powered',
      privacyImpact: 'Lokal radio, ingen eksterne data',
      recommendedPlacement: 'Plasseres i stikkontakter halvveis mellom koordinator og ytterste batterisensorer.',
      priority: 'Høy',
      limitations: 'Må være kontinuerlig tilkoblet strøm. Slås sikringen av vil rutingen måtte rekonfigureres.',
    });
  }

  // Check 3: Missing Smoke / Fire monitoring
  const hasSmoke = ctx.states.some(
    (s) => s.attributes.device_class === 'smoke' || s.entity_id.includes('smoke') || s.entity_id.includes('fire')
  );
  if (!hasSmoke) {
    recommendations.push({
      id: 'adv_smoke_alarm',
      problem: 'Dokumentert sikkerhetsgap: Ingen røykvarslere eller brannsensorer er integrert i Home Assistant.',
      proposedCategory: 'Tilkoblet optisk røykvarsler med lokal protokoll',
      suggestedHardware: 'Optisk røykvarsler (Zigbee / Z-Wave sertifisert iht. EN 14604)',
      requiredProtocol: 'zigbee',
      localControl: '100% Local (Push)',
      haCompatibility: 'Native (Home Assistant Recommended)',
      coordinatorRequirement: 'Zigbee eller Z-Wave koordinator',
      powerType: 'Battery (CR2032/CR2450)',
      privacyImpact: 'Ingen sky-tilkobling, privat lokal protokoll',
      recommendedPlacement: 'I rømningsveier, gang utenfor soverom og i oppholdsrom.',
      priority: 'Høy',
      limitations: 'Home Assistant skal aldri erstatte påkrevde autonome sirener, men fungere som sekundær digital varsling.',
    });
  }

  // Check 4: Uninterruptible Power Supply (UPS) for Core stability
  if (ctx.health.installationType === 'green' || ctx.health.installationType === 'yellow' || ctx.health.installationType === 'core') {
    recommendations.push({
      id: 'adv_ups_power',
      problem: 'Dokumentert risiko for filsystemkorrupsjon: Verten kjører på direkte nettspenning uten backup-batteri.',
      proposedCategory: 'Liten Line-Interactive USB UPS',
      suggestedHardware: 'USB HID-kompatibel UPS med NUT (Network UPS Tools) støtte',
      requiredProtocol: 'ethernet',
      localControl: '100% Local (Push)',
      haCompatibility: 'Native (Home Assistant Recommended)',
      coordinatorRequirement: 'USB-kabel til HA vert eller nettverkstilkoblet NUT server',
      powerType: 'Mains powered',
      privacyImpact: 'Ingen sky-tilkobling, privat lokal protokoll',
      recommendedPlacement: 'I teknisk skap ved Home Assistant maskinvare og nettverksruter.',
      priority: 'Medium',
      limitations: 'Krever plassering i nærheten av maskinvaren og periodisk batteritest hvert 3. år.',
    });
  }

  return recommendations;
}
