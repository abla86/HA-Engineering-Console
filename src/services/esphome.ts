import { ESPHomeNode } from '../../packages/shared/src/types.js';
import { YamlEngine } from '../../packages/config-engine/src/yaml-validator.js';
import { redactString } from '../../packages/shared/src/redact.js';
import JSZip from 'jszip';

export const INITIAL_ESPHOME_NODES: ESPHomeNode[] = [
  {
    id: 'esp32_climate_proxy',
    name: 'esp32-climate-proxy',
    friendly_name: 'Stue Klima & BLE Proxy',
    board: 'esp32dev',
    platform: 'esp32',
    status: 'online',
    ip_address: '192.168.1.142',
    wifi_signal_dbm: -58,
    firmware_version: '2024.9.1',
    last_seen: new Date(Date.now() - 1000 * 45).toISOString(),
    features: ['bluetooth_proxy', 'bme280', 'ota', 'wifi_signal', 'status_led'],
    fileName: 'esphome/esp32_climate_proxy.yaml',
    comment: 'ESP32 med aktiv Bluetooth Proxy for Nuki lås og BME280 klimamåler på I2C.',
    yaml: `esphome:
  name: esp32-climate-proxy
  friendly_name: "Stue Klima & BLE Proxy"

esp32:
  board: esp32dev
  framework:
    type: esp-idf

# Aktiver Bluetooth Proxy for utvidet Home Assistant BLE-dekning
bluetooth_proxy:
  active: true

logger:
  level: INFO

api:
  encryption:
    key: !secret esphome_api_encryption_key

ota:
  - platform: esphome
    password: !secret esphome_ota_password

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  fast_connect: true

  # Fallback AP hvis hjemmenettverket er nede
  ap:
    ssid: "ESP32-Fallback-Hotspot"
    password: !secret fallback_ap_password

captive_portal:

i2c:
  sda: GPIO21
  scl: GPIO22
  scan: true

sensor:
  - platform: bme280_i2c
    temperature:
      name: "Stue Temperatur"
      oversampling: 16x
      filters:
        - median:
            window_size: 7
            send_every: 4
            send_first_at: 1
    pressure:
      name: "Stue Lufttrykk"
      oversampling: 16x
    humidity:
      name: "Stue Luftfuktighet"
      oversampling: 16x
    address: 0x76
    update_interval: 30s

  - platform: wifi_signal
    name: "WiFi Signalstyrke"
    update_interval: 60s

status_led:
  pin: GPIO2
`,
  },
  {
    id: 'mailbox_sensor',
    name: 'mailbox-sensor',
    friendly_name: 'Postkassesensor (Deep Sleep)',
    board: 'd1_mini',
    platform: 'esp8266',
    status: 'online',
    ip_address: '192.168.1.189',
    wifi_signal_dbm: -68,
    firmware_version: '2024.9.1',
    last_seen: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    features: ['deep_sleep', 'reed_switch', 'battery_check', 'fast_connect'],
    fileName: 'esphome/mailbox_sensor.yaml',
    comment: 'Ultra-lavt strømforbruk med magnetbryter på lokket og 12-timers vekkesyklus.',
    yaml: `esphome:
  name: mailbox-sensor
  friendly_name: "Postkassesensor"

esp8266:
  board: d1_mini

logger:
  baud_rate: 0 # Deaktiver serieport for å spare batteri

api:
  reboot_timeout: 0s

ota:
  - platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
  fast_connect: true

deep_sleep:
  id: deep_sleep_control
  run_duration: 12s
  sleep_duration: 12h

binary_sensor:
  - platform: gpio
    pin:
      number: GPIO14
      mode: INPUT_PULLUP
      inverted: true
    name: "Postkasselokk Åpnet"
    filters:
      - delayed_on: 50ms
`,
  },
  {
    id: 'sonoff_power_s31',
    name: 'sonoff-s31-vaskemaskin',
    friendly_name: 'Vaskemaskin Strømmåler & Relé',
    board: 'esp01_1m',
    platform: 'esp8266',
    status: 'online',
    ip_address: '192.168.1.115',
    wifi_signal_dbm: -52,
    firmware_version: '2024.9.0',
    last_seen: new Date(Date.now() - 1000 * 20).toISOString(),
    features: ['cse7766_power', 'relay', 'status_led', 'thermal_protection'],
    fileName: 'esphome/sonoff_s31_washer.yaml',
    comment: 'Sonoff S31 med sanntids watt-, volt- og strømmåling for vaskemaskinsyklus.',
    yaml: `esphome:
  name: sonoff-s31-vaskemaskin
  friendly_name: "Vaskemaskin Strømmåler"

esp8266:
  board: esp01_1m

logger:
  baud_rate: 0

api:

ota:
  - platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

uart:
  rx_pin: GPIO03
  baud_rate: 4800

sensor:
  - platform: cse7766
    current:
      name: "Vaskemaskin Strømforbruk"
    voltage:
      name: "Nettspenning Volt"
    power:
      name: "Vaskemaskin Aktiv Effekt Watt"
      id: washer_watt

switch:
  - platform: gpio
    name: "Vaskemaskin Relé"
    pin: GPIO12
    id: relay
`,
  },
  {
    id: 'epaper_status_display',
    name: 'epaper-gang-status',
    friendly_name: 'Gang E-Paper Informasjonsskjerm',
    board: 'esp32dev',
    platform: 'esp32',
    status: 'online',
    ip_address: '192.168.1.177',
    wifi_signal_dbm: -55,
    firmware_version: '2024.8.4',
    last_seen: new Date(Date.now() - 1000 * 180).toISOString(),
    features: ['waveshare_epaper', 'spi', 'font_rendering', 'homeassistant_time'],
    fileName: 'esphome/epaper_status_display.yaml',
    comment: 'Waveshare 4.2-tommers e-paper som viser kollektivavganger og værvarsel.',
    yaml: `esphome:
  name: epaper-gang-status
  friendly_name: "Gang E-Paper Skjerm"

esp32:
  board: esp32dev

logger:

api:

ota:
  - platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

spi:
  clk_pin: GPIO18
  mosi_pin: GPIO23

display:
  - platform: waveshare_epaper
    cs_pin: GPIO5
    dc_pin: GPIO17
    busy_pin: GPIO4
    reset_pin: GPIO16
    model: 4.20in
    update_interval: 10min
    lambda: |-
      it.print(10, 10, id(font_title), "Smarthus Status");
      it.printf(10, 50, id(font_body), "Temp Stue: %.1f C", id(living_room_temp).state);

time:
  - platform: homeassistant
    id: ha_time
`,
  },
];

const LOCAL_STORAGE_KEY = 'ha_console_esphome_nodes';

export function loadESPHomeNodes(): ESPHomeNode[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore parse error
  }
  return INITIAL_ESPHOME_NODES;
}

export function saveESPHomeNodes(nodes: ESPHomeNode[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nodes));
  } catch {
    // Ignore storage quota error
  }
}

export interface ESPHomeCompilationResult {
  success: boolean;
  ramUsagePercent: number;
  flashUsagePercent: number;
  ramBytes: number;
  flashBytes: number;
  compilerLog: string[];
  warnings: string[];
}

export function simulateCompilation(node: ESPHomeNode): ESPHomeCompilationResult {
  const isEsp32 = node.platform === 'esp32';
  const validation = YamlEngine.validate(node.yaml, 'esphome');

  if (!validation.valid) {
    return {
      success: false,
      ramUsagePercent: 0,
      flashUsagePercent: 0,
      ramBytes: 0,
      flashBytes: 0,
      compilerLog: [
        `[INFO] Starting ESPHome compiler v${node.firmware_version}...`,
        `[ERROR] Configuration check failed for ${node.fileName}:`,
        ...validation.errors.map((e) => ` - [Line ${e.line || '?'}] ${e.message}`),
      ],
      warnings: [],
    };
  }

  // Calculate realistic firmware metrics
  const hasBle = node.yaml.includes('bluetooth_proxy:');
  const hasDisplay = node.yaml.includes('display:');
  const flashCap = isEsp32 ? 4 * 1024 * 1024 : 1 * 1024 * 1024;
  const ramCap = isEsp32 ? 320 * 1024 : 80 * 1024;

  const flashUsed = Math.floor((hasBle ? 1450000 : hasDisplay ? 980000 : 480000) + Math.random() * 12000);
  const ramUsed = Math.floor((hasBle ? 142000 : hasDisplay ? 62000 : 38000) + Math.random() * 4000);

  const flashPercent = parseFloat(((flashUsed / flashCap) * 100).toFixed(1));
  const ramPercent = parseFloat(((ramUsed / ramCap) * 100).toFixed(1));

  return {
    success: true,
    ramUsagePercent: ramPercent,
    flashUsagePercent: flashPercent,
    ramBytes: ramUsed,
    flashBytes: flashUsed,
    compilerLog: [
      `INFO ESPHome ${node.firmware_version}`,
      `INFO Reading configuration ${node.fileName}...`,
      `INFO Generating C++ code...`,
      `INFO Compiling app with platform ${node.platform} (${node.board})...`,
      `Compiling .pioenvs/${node.name}/src/main.cpp.o`,
      `Linking .pioenvs/${node.name}/firmware.elf`,
      `RAM:   [${'='.repeat(Math.floor(ramPercent / 10))}${' '.repeat(10 - Math.floor(ramPercent / 10))}] ${ramPercent}% (used ${ramUsed} bytes from ${ramCap} bytes)`,
      `Flash: [${'='.repeat(Math.floor(flashPercent / 10))}${' '.repeat(10 - Math.floor(flashPercent / 10))}] ${flashPercent}% (used ${flashUsed} bytes from ${flashCap} bytes)`,
      `Building .pioenvs/${node.name}/firmware.bin`,
      `SUCCESS Successfully compiled firmware for ${node.name}!`,
    ],
    warnings: hasBle && !isEsp32 ? ['Bluetooth Proxy krever ESP32 og kan ikke kjøre på ESP8266.'] : [],
  };
}

export async function exportAllNodesZip(nodes: ESPHomeNode[]): Promise<Blob> {
  const zip = new JSZip();

  // Root secrets example
  zip.file(
    'secrets.yaml.example',
    `# ESPHome Secrets Template
wifi_ssid: "MyHomeWiFi"
wifi_password: "MySecurePassword123"
fallback_ap_password: "MyEmergencyPassword"
esphome_api_encryption_key: "GENERATE_RANDOM_BASE64_KEY"
esphome_ota_password: "MyOtaPassword"
`
  );

  // README for GitHub
  zip.file(
    'README.md',
    `# ESPHome Repository Nodes Bundle
Eksportert fra **HA Engineering Console**.

Inneholder følgende ESPHome-noder:
${nodes.map((n) => `- **${n.friendly_name}** (\`${n.name}\` på ${n.board}) -> \`${n.fileName}\``).join('\n')}

## Kompilering og overføring
\`\`\`bash
esphome compile esphome/esp32_climate_proxy.yaml
esphome run esphome/esp32_climate_proxy.yaml
\`\`\`
`
  );

  // Add all node configs
  for (const node of nodes) {
    const sanitizedYaml = redactString(node.yaml);
    zip.file(node.fileName, sanitizedYaml);
  }

  return await zip.generateAsync({ type: 'blob' });
}
