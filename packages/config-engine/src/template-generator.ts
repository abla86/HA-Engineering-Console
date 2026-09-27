export interface YamlTemplate {
  id: string;
  name: string;
  category: 'esphome' | 'automation' | 'configuration' | 'script' | 'helper' | 'dashboard' | 'mqtt' | 'docker';
  description: string;
  targetFile: string;
  yaml: string;
}

export const PRESET_TEMPLATES: YamlTemplate[] = [
  // --- ESPHome Templates ---
  {
    id: 'esphome_esp32_sensor_proxy',
    name: 'ESPHome: ESP32 Bluetooth Proxy & BME280 Klimasensor',
    category: 'esphome',
    targetFile: 'esphome/esp32_climate_proxy.yaml',
    description: 'Komplett ESP32-firmware med Bluetooth Proxy for Home Assistant, I2C BME280 temperatur/fukt/trykk, status-LED, OTA og sikker WiFi.',
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
    id: 'esphome_d1_deep_sleep',
    name: 'ESPHome: D1 Mini Batteridrevet Postkassesensor (Deep Sleep)',
    category: 'esphome',
    targetFile: 'esphome/mailbox_sensor.yaml',
    description: 'Ultra-lavt strømforbruk med deep sleep. Våkner ved åpning av postkasselokk, rapporterer til HA og sover igjen.',
    yaml: `esphome:
  name: mailbox-sensor
  friendly_name: "Postkassesensor"

esp8266:
  board: d1_mini

logger:
  baud_rate: 0 # Deaktiver for å spare strøm

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

  // --- Automations ---
  {
    id: 'auto_motion_light',
    name: 'Automasjon: Bevegelsesstyrt lys med automatisk avstenging',
    category: 'automation',
    targetFile: 'automations.yaml',
    description: 'Slår på lys når bevegelse oppdages, og slår av etter 3 minutters fravær uten race condition.',
    yaml: `alias: 'Bevegelsesstyrt belysning Gang'
description: 'Slår på lyset ved bevegelse og av etter inaktivitet'
trigger:
  - platform: state
    entity_id: binary_sensor.hallway_motion
    to: 'on'
action:
  - service: light.turn_on
    target:
      entity_id: light.hallway_light
    data:
      brightness_pct: 80
  - wait_for_trigger:
      - platform: state
        entity_id: binary_sensor.hallway_motion
        to: 'off'
        for:
          minutes: 3
  - service: light.turn_off
    target:
      entity_id: light.hallway_light
mode: restart
max_exceeded: silent
`,
  },
  {
    id: 'auto_water_leak',
    name: 'Automasjon: Kritisk vannlekkasjevarsling & hovedkran',
    category: 'automation',
    targetFile: 'automations.yaml',
    description: 'Umiddelbar push-varsel og automatisk stenging av vannventil ved fuktoppdagelse.',
    yaml: `alias: 'Vannlekkasje oppdaget - Nødprosedyre'
description: 'Stenger vannventil og sender kritisk varsel til telefoner'
trigger:
  - platform: state
    entity_id:
      - binary_sensor.kitchen_leak_sensor
      - binary_sensor.bathroom_leak_sensor
    to: 'on'
action:
  - service: notify.notify
    data:
      title: '🚨 VANNLEKKASJE OPPDAGET!'
      message: 'Fuktsensor {{ trigger.to_state.name }} har utløst alarm. Stenger hovedkran.'
      data:
        push:
          sound:
            name: default
            critical: 1
            volume: 1.0
  - choose:
      - conditions:
          - condition: template
            value_template: "{{ is_state('valve.main_water_shutoff', 'open') }}"
        sequence:
          - service: valve.close_valve
            target:
              entity_id: valve.main_water_shutoff
mode: single
`,
  },
  {
    id: 'auto_tibber_energy_peak',
    name: 'Automasjon: Strømpris Peak Shaving (Nordpool / Tibber)',
    category: 'automation',
    targetFile: 'automations.yaml',
    description: 'Kobler ut varmtvannsbereder og elbillading når strømprisen er blant døgnets 3 dyreste timer.',
    yaml: `alias: 'Strømprisoptimalisering - Pause tunge laster'
description: 'Slår av varmtvannsbereder ved høye strømpriser'
trigger:
  - platform: numeric_state
    entity_id: sensor.electricity_price
    above: 1.50 # NOK per kWh
action:
  - service: switch.turn_off
    target:
      entity_id: switch.water_heater
  - service: notify.notify
    data:
      message: 'Strømprisen er over 1,50 kr/kWh. Varmtvannsbereder er midlertidig pauset.'
mode: single
`,
  },

  // --- Configuration & Packages ---
  {
    id: 'config_recorder_optimize',
    name: 'Konfigurasjon: Recorder optimalisering (hindrer SQLite-slitasje)',
    category: 'configuration',
    targetFile: 'configuration.yaml',
    description: 'Ekskluderer nettverksping og høytfrekvente sensorer fra databasen for raskere oppstart og mindre I/O.',
    yaml: `default_config:

frontend:
  themes: !include_dir_merge_named themes

automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml

http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - 192.168.1.0/24

recorder:
  purge_keep_days: 7
  auto_purge: true
  commit_interval: 10
  exclude:
    domains:
      - updater
      - camera
    entity_globs:
      - sensor.*_ping*
      - sensor.*_rssi*
      - sensor.*_uptime*
      - sensor.*_cpu_temp*
    entities:
      - sun.sun
`,
  },

  // --- Scripts & Helpers ---
  {
    id: 'script_goodnight',
    name: 'Script: God Natt Sikkerhetsrutine',
    category: 'script',
    targetFile: 'scripts.yaml',
    description: 'Sekvens som dimmer lys, låser dører, lukker garasjeport og verifiserer vindussensorer.',
    yaml: `goodnight_routine:
  alias: "God Natt Rutine"
  icon: "mdi:bed"
  sequence:
    - service: light.turn_off
      target:
        entity_id: all
    - service: lock.lock
      target:
        entity_id: lock.front_door
    - service: cover.close_cover
      target:
        entity_id: cover.garage_door
    - delay: '00:00:03'
    - choose:
        - conditions:
            - condition: state
              entity_id: binary_sensor.all_windows
              state: 'on'
          sequence:
            - service: notify.notify
              data:
                title: "Vindu står åpent!"
                message: "Et vindu er åpent i første etasje."
`,
  },
  {
    id: 'helpers_smarthouse',
    name: 'Helpers: Input Booleans, Timere & Schedules',
    category: 'helper',
    targetFile: 'packages/helpers.yaml',
    description: 'Praktiske hjelpe-entiteter for feriemodus, gjestemodus og vaskemaskintimer.',
    yaml: `input_boolean:
  vacation_mode:
    name: "Feriemodus"
    icon: mdi:airplane
  guest_mode:
    name: "Gjestemodus"
    icon: mdi:account-group

input_number:
  target_living_room_temp:
    name: "Ønsket Temperatur Stue"
    min: 15
    max: 25
    step: 0.5
    unit_of_measurement: "°C"
    icon: mdi:thermometer

timer:
  laundry_cycle:
    name: "Vaskemaskintimer"
    duration: "01:30:00"
    icon: mdi:washing-machine
`,
  },

  // --- Lovelace Dashboard ---
  {
    id: 'dashboard_modern_grid',
    name: 'Dashboard: Lovelace Moderne Hjemmekontroll',
    category: 'dashboard',
    targetFile: 'dashboards/ui-lovelace.yaml',
    description: 'Ren responsiv grid-layout for lys, temperaturer, sikkerhetsstatus og energiforbruk.',
    yaml: `title: Hjemmekontroll
views:
  - title: Oversikt
    path: oversikt
    icon: mdi:home
    badges:
      - entity: sensor.living_room_temperature
      - entity: binary_sensor.front_door
    type: grid
    cards:
      - type: heading
        heading: "Belysning & Rom"
      - type: entities
        title: "Stue"
        entities:
          - entity: light.living_room_main_light
          - entity: sensor.living_room_temperature
          - entity: sensor.living_room_humidity
      - type: energy-usage-graph
        title: "Energiforbruk i dag"
      - type: alarm-panel
        entity: alarm_control_panel.home_alarm
`,
  },

  // --- MQTT Integration ---
  {
    id: 'mqtt_custom_sensors',
    name: 'MQTT: Definisjon av egendefinerte sensorer & releer',
    category: 'mqtt',
    targetFile: 'packages/mqtt_devices.yaml',
    description: 'MQTT-konfigurasjon for frittstående mikrokontrollere, Zigbee2MQTT og egne IoT-noder.',
    yaml: `mqtt:
  sensor:
    - name: "Vanntank Nivå"
      state_topic: "home/cistern/level"
      unit_of_measurement: "%"
      value_template: "{{ value_json.level }}"
      device_class: distance
      unique_id: "cistern_level_sensor_01"

    - name: "Garasje Strømforbruk"
      state_topic: "home/garage/power"
      unit_of_measurement: "W"
      device_class: power
      state_class: measurement
      unique_id: "garage_power_meter_01"

  switch:
    - name: "Hagevanning Ventil"
      command_topic: "home/garden/irrigation/set"
      state_topic: "home/garden/irrigation/state"
      payload_on: "ON"
      payload_off: "OFF"
      icon: mdi:sprinkler
      unique_id: "garden_irrigation_switch_01"
`,
  },

  // --- Docker Compose Stack ---
  {
    id: 'docker_compose_ha_stack',
    name: 'Docker: Komplett Smarthus Compose-Stack',
    category: 'docker',
    targetFile: 'docker-compose.yml',
    description: 'Full produksjonsstack med Home Assistant, Mosquitto MQTT, Zigbee2MQTT og ESPHome Dashboard.',
    yaml: `services:
  homeassistant:
    container_name: homeassistant
    image: "ghcr.io/home-assistant/home-assistant:stable"
    volumes:
      - ./config:/config
      - /etc/localtime:/etc/localtime:ro
      - /run/dbus:/run/dbus:ro
    restart: unless-stopped
    privileged: true
    network_mode: host

  esphome:
    container_name: esphome
    image: "ghcr.io/esphome/esphome:latest"
    volumes:
      - ./esphome:/config
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    network_mode: host

  mosquitto:
    container_name: mosquitto
    image: eclipse-mosquitto:2.0
    restart: unless-stopped
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data

  zigbee2mqtt:
    container_name: zigbee2mqtt
    image: koenkk/zigbee2mqtt:latest
    restart: unless-stopped
    volumes:
      - ./zigbee2mqtt:/app/data
      - /run/udev:/run/udev:ro
    ports:
      - "8080:8080"
    environment:
      - TZ=Europe/Oslo
    devices:
      - /dev/serial/by-id/usb-Nabu_Casa_SkyConnect_v1.0-if00-port0:/dev/ttyUSB0
`,
  },
];

/**
 * Natural language to Home Assistant YAML generator
 */
export function generateYamlFromPrompt(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('esphome') || p.includes('esp32') || p.includes('bme280') || p.includes('proxy')) {
    return PRESET_TEMPLATES[0].yaml;
  }

  if (p.includes('d1') || p.includes('batteri') || p.includes('deep sleep') || p.includes('postkasse')) {
    return PRESET_TEMPLATES[1].yaml;
  }

  if (p.includes('vann') || p.includes('lekkasje') || p.includes('fukt') || p.includes('leak')) {
    return PRESET_TEMPLATES[3].yaml;
  }

  if (p.includes('strømpris') || p.includes('tibber') || p.includes('nordpool') || p.includes('varmtvann')) {
    return PRESET_TEMPLATES[4].yaml;
  }

  if (p.includes('database') || p.includes('recorder') || p.includes('ytelse') || p.includes('exclude')) {
    return PRESET_TEMPLATES[5].yaml;
  }

  if (p.includes('script') || p.includes('sekvens') || p.includes('god natt') || p.includes('kveld')) {
    return PRESET_TEMPLATES[6].yaml;
  }

  if (p.includes('helper') || p.includes('hjelper') || p.includes('input_boolean') || p.includes('timer')) {
    return PRESET_TEMPLATES[7].yaml;
  }

  if (p.includes('dashboard') || p.includes('lovelace') || p.includes('kort') || p.includes('ui')) {
    return PRESET_TEMPLATES[8].yaml;
  }

  if (p.includes('mqtt') || p.includes('topic') || p.includes('broker')) {
    return PRESET_TEMPLATES[9].yaml;
  }

  if (p.includes('docker') || p.includes('compose') || p.includes('container') || p.includes('casaos')) {
    return PRESET_TEMPLATES[10].yaml;
  }

  // Default motion light
  return PRESET_TEMPLATES[2].yaml;
}
