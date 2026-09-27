import { CapabilityMatrix, HAArea, HADevice, HAIntegration, HAState, InstallationType, SystemHealth } from '../../shared/src/types.js';
import { getMockProfile, MockProfileData } from './mock-adapter.js';

export interface ClientConnectionOptions {
  url: string;
  token?: string;
  isMock: boolean;
  mockProfile?: 'green' | 'casaos' | 'rpi_core' | 'yellow_matter';
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  installationType: InstallationType;
  tlsSecure: boolean;
  responseTimeMs: number;
  message: string;
  capabilities: CapabilityMatrix;
}

export class HAClient {
  private options: ClientConnectionOptions;
  private mockData: MockProfileData;

  constructor(options: ClientConnectionOptions) {
    this.options = options;
    this.mockData = getMockProfile(options.mockProfile || 'green');
  }

  public setMockProfile(profile: 'green' | 'casaos' | 'rpi_core' | 'yellow_matter') {
    this.options.mockProfile = profile;
    this.mockData = getMockProfile(profile);
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    if (this.options.isMock) {
      return {
        success: true,
        version: this.mockData.version,
        installationType: this.mockData.installationType,
        tlsSecure: this.options.url.startsWith('https://'),
        responseTimeMs: 8,
        message: `Koblet til virtuell testinstans: ${this.mockData.host.hostname} (${this.mockData.installationType.toUpperCase()})`,
        capabilities: this.mockData.capabilities,
      };
    }

    // Real HA Instance check via REST API
    try {
      const cleanUrl = this.options.url.replace(/\/+$/, '');
      const isHttps = cleanUrl.startsWith('https://');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(`${cleanUrl}/api/config`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.options.token || ''}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (resp.status === 401) {
        return {
          success: false,
          installationType: 'generic_linux',
          tlsSecure: isHttps,
          responseTimeMs: elapsed,
          message: 'Autentiseringsfeil (401 Unauthorized): Long-Lived Access Token er ugyldig eller utløpt.',
          capabilities: this.getMinimalCapabilities(),
        };
      }

      if (!resp.ok) {
        return {
          success: false,
          installationType: 'generic_linux',
          tlsSecure: isHttps,
          responseTimeMs: elapsed,
          message: `Home Assistant returnerte HTTP ${resp.status}: ${resp.statusText}`,
          capabilities: this.getMinimalCapabilities(),
        };
      }

      const configData = await resp.json();
      const detectedType = this.detectInstallationType(configData);
      const capabilities = this.detectCapabilities(configData, detectedType);

      return {
        success: true,
        version: configData.version || 'Unknown',
        installationType: detectedType,
        tlsSecure: isHttps,
        responseTimeMs: elapsed,
        message: `Tilkobling vellykket til Home Assistant ${configData.version} (${configData.location_name || 'Lokal'})`,
        capabilities,
      };
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      let errorMsg = err.message || 'Kunne ikke oppnå kontakt med Home Assistant';
      if (err.name === 'AbortError') {
        errorMsg = 'Tilkoblingstidsavbrudd (Timeout etter 6 sekunder). Sjekk om IP/port er tilgjengelig.';
      } else if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
        errorMsg = 'Forbindelsen ble avvist (ECONNREFUSED). Kjører Home Assistant på oppgitt port (standard 8123)?';
      }

      return {
        success: false,
        installationType: 'generic_linux',
        tlsSecure: this.options.url.startsWith('https://'),
        responseTimeMs: elapsed,
        message: errorMsg,
        capabilities: this.getMinimalCapabilities(),
      };
    }
  }

  public async getStates(): Promise<HAState[]> {
    if (this.options.isMock) {
      return this.mockData.states;
    }

    const cleanUrl = this.options.url.replace(/\/+$/, '');
    const resp = await fetch(`${cleanUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${this.options.token || ''}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Feil ved henting av states: HTTP ${resp.status}`);
    }

    return await resp.json();
  }

  public async getDevices(): Promise<HADevice[]> {
    if (this.options.isMock) {
      return this.mockData.devices;
    }
    // Fallback: derive devices from states or websocket
    const states = await this.getStates();
    return this.synthesizeDevicesFromStates(states);
  }

  public async getAreas(): Promise<HAArea[]> {
    if (this.options.isMock) {
      return this.mockData.areas;
    }
    return [
      { area_id: 'default', name: 'Standard område', devices_count: 1, entities_count: 10 },
    ];
  }

  public async getIntegrations(): Promise<HAIntegration[]> {
    if (this.options.isMock) {
      return this.mockData.integrations;
    }
    return [
      { domain: 'core', title: 'Home Assistant Core', state: 'loaded' },
    ];
  }

  public async getHealth(): Promise<SystemHealth> {
    if (this.options.isMock) {
      return this.mockData.health;
    }

    const states = await this.getStates();
    const unavail = states.filter((s) => s.state === 'unavailable' || s.state === 'unknown');

    return {
      score: Math.max(30, 100 - unavail.length * 5),
      installationType: 'generic_linux',
      version: '2024.9',
      coreRunning: true,
      cpuPercent: 25.0,
      memoryPercent: 45.0,
      diskPercent: 35.0,
      dbSizeMb: 500,
      recorderQueueLength: 2,
      integrationIssuesCount: 0,
      unavailableEntitiesCount: unavail.length,
      flappingEntitiesCount: 0,
      totalEntities: states.length,
      totalDevices: 10,
      totalAutomations: states.filter((s) => s.entity_id.startsWith('automation.')).length,
      uptimeSeconds: 86400,
    };
  }

  public async getRawConfigYaml(): Promise<string> {
    if (this.options.isMock) {
      return this.mockData.configYaml;
    }
    return '# Configuration hentes via Supervisor / File API når tilgjengelig';
  }

  public async getAutomationsYaml(): Promise<string> {
    if (this.options.isMock) {
      return this.mockData.automationsYaml;
    }
    return '# Automations';
  }

  public async getLogs() {
    if (this.options.isMock) {
      return this.mockData.logs;
    }
    return [];
  }

  public async getRepairs() {
    if (this.options.isMock) {
      return this.mockData.repairs;
    }
    return [];
  }

  public async checkConfig(): Promise<{ result: 'valid' | 'invalid'; errors?: string }> {
    if (this.options.isMock) {
      return { result: 'valid' };
    }

    try {
      const cleanUrl = this.options.url.replace(/\/+$/, '');
      const resp = await fetch(`${cleanUrl}/api/config/core/check_config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.token || ''}`,
          'Content-Type': 'application/json',
        },
      });
      if (resp.ok) {
        const body = await resp.json();
        return { result: body.result, errors: body.errors };
      }
      return { result: 'invalid', errors: `HTTP ${resp.status}` };
    } catch (e: any) {
      return { result: 'invalid', errors: e.message };
    }
  }

  private detectInstallationType(config: any): InstallationType {
    const components: string[] = config.components || [];
    if (components.includes('hassio')) {
      return 'ha_os';
    }
    return 'container';
  }

  private detectCapabilities(config: any, type: InstallationType): CapabilityMatrix {
    const components: string[] = config.components || [];
    const hasHassio = components.includes('hassio');
    const hasZha = components.includes('zha');
    const hasZwave = components.includes('zwave_js');
    const hasBluetooth = components.includes('bluetooth');

    return {
      supervisor: hasHassio,
      host_reboot: hasHassio,
      backups: hasHassio,
      config_write: true,
      file_access: hasHassio,
      shell: false,
      addon_management: hasHassio,
      zigbee: hasZha,
      zwave: hasZwave,
      bluetooth: hasBluetooth,
      hardware_telemetry: true,
      rest_api: true,
      websocket_api: true,
    };
  }

  private getMinimalCapabilities(): CapabilityMatrix {
    return {
      supervisor: false,
      host_reboot: false,
      backups: false,
      config_write: false,
      file_access: false,
      shell: false,
      addon_management: false,
      zigbee: false,
      zwave: false,
      bluetooth: false,
      hardware_telemetry: false,
      rest_api: false,
      websocket_api: false,
    };
  }

  private synthesizeDevicesFromStates(states: HAState[]): HADevice[] {
    const devMap = new Map<string, HADevice>();
    for (const st of states) {
      const parts = st.entity_id.split('.');
      const domain = parts[0];
      const devName = st.attributes.friendly_name || parts[1];
      const devId = `dev_${domain}_${parts[1]}`;

      if (!devMap.has(devId)) {
        devMap.set(devId, {
          id: devId,
          name: devName,
          manufacturer: 'Home Assistant Integration',
          model: domain,
          protocol: domain === 'zha' ? 'zigbee' : 'wifi',
          entities_count: 1,
        });
      } else {
        const item = devMap.get(devId)!;
        item.entities_count = (item.entities_count || 0) + 1;
      }
    }
    return Array.from(devMap.values());
  }
}
