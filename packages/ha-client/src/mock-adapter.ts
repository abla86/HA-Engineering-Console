import { CapabilityMatrix, HAArea, HADevice, HAIntegration, HAState, InstallationType, SystemHealth } from '../../shared/src/types.js';

export interface MockProfileData {
  installationType: InstallationType;
  version: string;
  osVersion?: string;
  supervisorVersion?: string;
  host: {
    hostname: string;
    operating_system: string;
    chassis: string;
    kernel: string;
  };
  capabilities: CapabilityMatrix;
  health: SystemHealth;
  states: HAState[];
  devices: HADevice[];
  areas: HAArea[];
  integrations: HAIntegration[];
  logs: Array<{ timestamp: string; level: 'ERROR' | 'WARNING' | 'INFO'; message: string; source: string }>;
  repairs: Array<{ id: string; title: string; description: string; severity: 'critical' | 'warning' }>;
  configYaml: string;
  automationsYaml: string;
}

export function getMockProfile(profileName: 'green' | 'casaos' | 'rpi_core' | 'yellow_matter'): MockProfileData {
  switch (profileName) {
    case 'casaos':
      return createCasaOSProfile();
    case 'rpi_core':
      return createRpiCoreProfile();
    case 'yellow_matter':
      return createYellowProfile();
    case 'green':
    default:
      return createGreenProfile();
  }
}

function createGreenProfile(): MockProfileData {
  const areas: HAArea[] = [
    { area_id: 'living_room', name: 'Stue', devices_count: 5, entities_count: 14 },
    { area_id: 'kitchen', name: 'Kjøkken', devices_count: 4, entities_count: 10 },
    { area_id: 'hallway', name: 'Gang', devices_count: 2, entities_count: 5 },
    { area_id: 'bedroom', name: 'Hovedsoverom', devices_count: 3, entities_count: 8 },
    { area_id: 'bathroom', name: 'Bad', devices_count: 2, entities_count: 4 },
  ];

  const devices: HADevice[] = [
    {
      id: 'dev_ha_skyconnect',
      name: 'Home Assistant SkyConnect',
      manufacturer: 'Nabu Casa',
      model: 'SkyConnect v1.0',
      sw_version: '7.3.1.0',
      area_id: 'living_room',
      protocol: 'zigbee',
      entities_count: 3,
    },
    {
      id: 'dev_philips_hue_hub',
      name: 'Philips Hue Bridge',
      manufacturer: 'Signify',
      model: 'BSB002',
      sw_version: '1.63.1963089030',
      area_id: 'living_room',
      protocol: 'zigbee',
      entities_count: 6,
    },
    {
      id: 'dev_aqara_temp_living',
      name: 'Aqara Temperatur & Fukt Stue',
      manufacturer: 'Lumi / Aqara',
      model: 'WSDCGQ11LM',
      sw_version: '0.0.0_0025',
      area_id: 'living_room',
      protocol: 'zigbee',
      battery_level: 84,
      entities_count: 3,
    },
    {
      id: 'dev_aqara_temp_bath',
      name: 'Aqara Fuktsensor Bad',
      manufacturer: 'Lumi / Aqara',
      model: 'WSDCGQ11LM',
      sw_version: '0.0.0_0025',
      area_id: 'bathroom',
      protocol: 'zigbee',
      battery_level: 11, // CRITICAL LOW BATTERY FINDING
      entities_count: 3,
    },
    {
      id: 'dev_ikea_motion_hall',
      name: 'IKEA TRÅDFRI Bevegelsessensor Gang',
      manufacturer: 'IKEA of Sweden',
      model: 'E1745',
      sw_version: '24.4.5',
      area_id: 'hallway',
      protocol: 'zigbee',
      battery_level: 68,
      entities_count: 2,
    },
    {
      id: 'dev_shelly_plug_kitchen',
      name: 'Shelly Plus Plug S Kaffetrakter',
      manufacturer: 'Shelly',
      model: 'SNSW-001P16EU',
      sw_version: '1.4.2',
      area_id: 'kitchen',
      protocol: 'wifi',
      entities_count: 4,
    },
    {
      id: 'dev_tibber_pulse',
      name: 'Tibber Pulse HAN Måler',
      manufacturer: 'Tibber',
      model: 'Pulse P1',
      sw_version: '1.2.14',
      area_id: null, // FINDING: Missing Area
      protocol: 'wifi',
      entities_count: 5,
    },
    {
      id: 'dev_unassigned_smart_bulb',
      name: 'TRADFRI bulb E27 CWS 806lm',
      manufacturer: 'IKEA',
      model: 'LED1624G9',
      sw_version: '1.2.221',
      area_id: null, // FINDING: Missing Area & Generic Name
      protocol: 'zigbee',
      entities_count: 2,
    },
  ];

  const states: HAState[] = [
    {
      entity_id: 'sensor.ha_green_cpu_percent',
      state: '18.4',
      attributes: { unit_of_measurement: '%', friendly_name: 'Home Assistant Green CPU' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.ha_green_memory_use_percent',
      state: '42.1',
      attributes: { unit_of_measurement: '%', friendly_name: 'HA Green Minnebruk' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.ha_green_disk_use_percent',
      state: '28.6',
      attributes: { unit_of_measurement: '%', friendly_name: 'HA Green eMMC Disk' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.ha_green_temperature',
      state: '44.8',
      attributes: { unit_of_measurement: '°C', friendly_name: 'HA Green SoC Temperatur' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.aqara_temp_bath_battery',
      state: '11',
      attributes: { unit_of_measurement: '%', device_class: 'battery', friendly_name: 'Aqara Fuktsensor Bad Batteri' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.living_room_temperature',
      state: '21.5',
      attributes: { unit_of_measurement: '°C', device_class: 'temperature', friendly_name: 'Temperatur Stue' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.living_room_humidity',
      state: '43.0',
      attributes: { unit_of_measurement: '%', device_class: 'humidity', friendly_name: 'Luftfuktighet Stue' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.bathroom_humidity',
      state: '68.2',
      attributes: { unit_of_measurement: '%', device_class: 'humidity', friendly_name: 'Luftfuktighet Bad' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'light.living_room_main_light',
      state: 'on',
      attributes: { brightness: 180, color_mode: 'color_temp', friendly_name: 'Taklampe Stue' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'binary_sensor.hallway_motion',
      state: 'off',
      attributes: { device_class: 'motion', friendly_name: 'Bevegelse Gang' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'switch.coffee_maker',
      state: 'off',
      attributes: { current_power_w: 0.0, friendly_name: 'Kaffetrakter' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.tibber_accumulated_consumption',
      state: '14.82',
      attributes: { unit_of_measurement: 'kWh', friendly_name: 'Forbruk i dag' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: 'sensor.tibber_power_hourly',
      state: '1850',
      attributes: { unit_of_measurement: 'W', friendly_name: 'Nåværende effekt' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
    {
      // FINDING: Flapping / Unavailable entity
      entity_id: 'sensor.old_garage_door_sensor',
      state: 'unavailable',
      attributes: { restored: true, friendly_name: 'Garasjeportsensor (Gammel)' },
      last_changed: new Date(Date.now() - 86400000 * 3).toISOString(),
      last_updated: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      // FINDING: Orphaned entity with no device
      entity_id: 'switch.orphaned_tuya_plug_9281',
      state: 'unavailable',
      attributes: { friendly_name: 'Tuya Smart Plug 9281' },
      last_changed: new Date(Date.now() - 86400000 * 7).toISOString(),
      last_updated: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      // FINDING: High frequency polling entity flooding SQLite DB recorder
      entity_id: 'sensor.network_ping_router',
      state: '1.24',
      attributes: { unit_of_measurement: 'ms', friendly_name: 'Router Ping Latency (1s polling)' },
      last_changed: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
  ];

  const integrations: HAIntegration[] = [
    { domain: 'zha', title: 'Zigbee Home Automation (SkyConnect)', state: 'loaded', config_entries_count: 1 },
    { domain: 'hue', title: 'Philips Hue', state: 'loaded', config_entries_count: 1 },
    { domain: 'shelly', title: 'Shelly Smart Home', state: 'loaded', config_entries_count: 1 },
    { domain: 'tibber', title: 'Tibber Energy API', state: 'loaded', config_entries_count: 1 },
    { domain: 'met', title: 'Meteorologisk institutt (Met.no)', state: 'loaded', config_entries_count: 1 },
    { domain: 'tuya', title: 'Tuya Cloud Integration', state: 'setup_error', config_entries_count: 1 }, // FINDING: integration error
  ];

  const logs = [
    { timestamp: '14:23:01', level: 'WARNING' as const, message: 'Device Aqara Fuktsensor Bad reporting critically low battery (11%)', source: 'homeassistant.components.zha' },
    { timestamp: '14:15:22', level: 'ERROR' as const, message: 'Tuya authentication failed: Token expired and refresh refused by Tuya OpenAPI endpoint', source: 'homeassistant.components.tuya' },
    { timestamp: '13:02:18', level: 'INFO' as const, message: 'Home Assistant Core 2024.9.1 initialized in 12.4s', source: 'homeassistant.bootstrap' },
  ];

  const repairs = [
    { id: 'tuya_auth_failure', title: 'Tuya autentisering feilet', description: 'Tuya Cloud kan ikke koble til. Vennligst oppdater utvikler-nøklene dine i Tuya IoT Platform.', severity: 'warning' as const },
    { id: 'deprecated_yaml_group', title: 'Utdatert group-syntaks i configuration.yaml', description: 'Bruk av tradisjonell group-plattform vil bli fjernet i 2025.1.', severity: 'warning' as const },
  ];

  const configYaml = `# Home Assistant Green configuration.yaml
default_config:

frontend:
  themes: !include_dir_merge_named themes

automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml

http:
  use_x_forwarded_for: false

recorder:
  purge_keep_days: 10
  # ADVICE: Lack of exclusion on sensor.network_ping_router causes unnecessary SQLite write load!
`;

  const automationsYaml = `- id: '1720000001'
  alias: 'Lys på ved bevegelse gang'
  description: 'Slår på lys i gangen ved bevegelse'
  trigger:
    - platform: state
      entity_id: binary_sensor.hallway_motion
      to: 'on'
  action:
    - service: light.turn_on
      target:
        entity_id: light.living_room_main_light
  mode: single

- id: '1720000002'
  alias: 'Kaffetrakter automatisk av'
  description: 'Slår av kaffetrakter etter 45 minutter'
  trigger:
    - platform: state
      entity_id: switch.coffee_maker
      to: 'on'
      for:
        minutes: 45
  action:
    - service: switch.turn_off
      target:
        entity_id: switch.coffee_maker
  mode: single

- id: '1720000003'
  alias: 'Gammel garasjevarsel (DØD TRIGGER)'
  description: 'Varsler når garasjeporten er åpen - refererer til slettet entity'
  trigger:
    - platform: state
      entity_id: sensor.old_garage_door_sensor # FINDING: Dead trigger on unavailable entity
      to: 'open'
  action:
    - service: notify.persistent_notification
      data:
        message: 'Garasjen står åpen!'
  mode: single

- id: '1720000004'
  alias: 'Risikabel nattmodus med lang delay'
  description: 'Har mode: single med 30 minutters sleep - mister nye triggere'
  trigger:
    - platform: time
      at: '23:00:00'
  action:
    - delay: '00:30:00' # FINDING: Race condition / trigger loss with mode: single
    - service: light.turn_off
      target:
        entity_id: all
  mode: single
`;

  return {
    installationType: 'green',
    version: '2024.9.1',
    osVersion: 'Home Assistant OS 12.3',
    supervisorVersion: '2024.08.2',
    host: {
      hostname: 'homeassistant-green',
      operating_system: 'Home Assistant OS 12.3',
      chassis: 'embedded',
      kernel: 'Linux 6.1.75-haos',
    },
    capabilities: {
      supervisor: true,
      host_reboot: true,
      backups: true,
      config_write: true,
      file_access: true,
      shell: false,
      addon_management: true,
      zigbee: true,
      zwave: false,
      bluetooth: false,
      hardware_telemetry: true,
      rest_api: true,
      websocket_api: true,
    },
    health: {
      score: 78,
      installationType: 'green',
      version: '2024.9.1',
      coreRunning: true,
      cpuPercent: 18.4,
      memoryPercent: 42.1,
      diskPercent: 28.6,
      temperatureC: 44.8,
      dbSizeMb: 412,
      recorderQueueLength: 4,
      lastBackupDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      integrationIssuesCount: 1,
      unavailableEntitiesCount: 2,
      flappingEntitiesCount: 1,
      totalEntities: states.length,
      totalDevices: devices.length,
      totalAutomations: 4,
      uptimeSeconds: 345600,
    },
    states,
    devices,
    areas,
    integrations,
    logs,
    repairs,
    configYaml,
    automationsYaml,
  };
}

function createCasaOSProfile(): MockProfileData {
  const base = createGreenProfile();
  return {
    ...base,
    installationType: 'casaos',
    osVersion: 'Debian 12 Bookworm (CasaOS Container Host)',
    supervisorVersion: undefined,
    host: {
      hostname: 'casaos-homeserver',
      operating_system: 'Debian GNU/Linux 12 (bookworm)',
      chassis: 'desktop',
      kernel: 'Linux 6.1.0-21-amd64',
    },
    capabilities: {
      supervisor: false, // NO SUPERVISOR IN CONTAINER
      host_reboot: false,
      backups: false, // Core backups through UI disabled
      config_write: true,
      file_access: true,
      shell: false,
      addon_management: false,
      zigbee: true,
      zwave: false,
      bluetooth: false,
      hardware_telemetry: true,
      rest_api: true,
      websocket_api: true,
    },
    health: {
      ...base.health,
      score: 64,
      installationType: 'casaos',
      cpuPercent: 8.2,
      memoryPercent: 61.4,
      diskPercent: 78.5, // High disk warning
      temperatureC: 38.0,
      dbSizeMb: 1840, // DB Bloat
      lastBackupDate: undefined, // Missing backups
    },
  };
}

function createRpiCoreProfile(): MockProfileData {
  const base = createGreenProfile();
  return {
    ...base,
    installationType: 'core',
    osVersion: 'Raspberry Pi OS Lite 64-bit',
    supervisorVersion: undefined,
    host: {
      hostname: 'raspberrypi4-core',
      operating_system: 'Debian GNU/Linux 11 (bullseye)',
      chassis: 'embedded',
      kernel: 'Linux 5.15.84-v8+',
    },
    capabilities: {
      supervisor: false,
      host_reboot: false,
      backups: false,
      config_write: true,
      file_access: false,
      shell: false,
      addon_management: false,
      zigbee: false,
      zwave: false,
      bluetooth: true,
      hardware_telemetry: true,
      rest_api: true,
      websocket_api: true,
    },
    health: {
      ...base.health,
      score: 59,
      installationType: 'core',
      cpuPercent: 54.0,
      memoryPercent: 81.2,
      diskPercent: 89.1,
      temperatureC: 68.4, // HIGH TEMP
      dbSizeMb: 950,
    },
  };
}

function createYellowProfile(): MockProfileData {
  const base = createGreenProfile();
  return {
    ...base,
    installationType: 'yellow',
    osVersion: 'Home Assistant OS 13.0',
    supervisorVersion: '2024.09.0',
    host: {
      hostname: 'homeassistant-yellow',
      operating_system: 'Home Assistant OS 13.0',
      chassis: 'embedded',
      kernel: 'Linux 6.6.31-haos',
    },
    capabilities: {
      supervisor: true,
      host_reboot: true,
      backups: true,
      config_write: true,
      file_access: true,
      shell: true,
      addon_management: true,
      zigbee: true,
      zwave: true,
      bluetooth: true,
      hardware_telemetry: true,
      rest_api: true,
      websocket_api: true,
    },
    health: {
      ...base.health,
      score: 91,
      installationType: 'yellow',
      cpuPercent: 12.0,
      memoryPercent: 34.0,
      diskPercent: 14.5,
      temperatureC: 41.2,
      dbSizeMb: 240,
    },
  };
}
