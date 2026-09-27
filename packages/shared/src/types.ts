export type InstallationType =
  | 'green'
  | 'yellow'
  | 'ha_os'
  | 'container'
  | 'core'
  | 'supervised'
  | 'casaos'
  | 'docker_compose'
  | 'generic_linux';

export type SecurityMode = 'READ_ONLY' | 'PROPOSE' | 'APPLY_SAFE' | 'ADVANCED';

export interface CapabilityMatrix {
  supervisor: boolean;
  host_reboot: boolean;
  backups: boolean;
  config_write: boolean;
  file_access: boolean;
  shell: boolean;
  addon_management: boolean;
  zigbee: boolean;
  zwave: boolean;
  bluetooth: boolean;
  hardware_telemetry: boolean;
  rest_api: boolean;
  websocket_api: boolean;
}

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HADevice {
  id: string;
  name: string;
  model?: string;
  manufacturer?: string;
  sw_version?: string;
  area_id?: string | null;
  via_device_id?: string | null;
  disabled_by?: string | null;
  connections?: [string, string][];
  protocol?: 'zigbee' | 'zwave' | 'matter' | 'wifi' | 'bluetooth' | 'virtual';
  battery_level?: number | null;
  entities_count?: number;
}

export interface HAArea {
  area_id: string;
  name: string;
  picture?: string | null;
  devices_count?: number;
  entities_count?: number;
}

export interface ESPHomeNode {
  id: string;
  name: string;
  friendly_name: string;
  board: string;
  platform: 'esp32' | 'esp8266' | 'rp2040' | 'bk72xx';
  status: 'online' | 'offline' | 'updating';
  ip_address?: string;
  wifi_signal_dbm?: number;
  firmware_version: string;
  last_seen: string;
  features: string[];
  yaml: string;
  fileName: string;
  comment?: string;
}

export interface HAIntegration {
  domain: string;
  title: string;
  version?: string;
  state: 'loaded' | 'setup_retry' | 'setup_error' | 'not_loaded';
  config_entries_count?: number;
  supports_options?: boolean;
}

export type FindingSeverity = 'critical' | 'warning' | 'improvement' | 'information';

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  confidence: number; // 0 - 100%
  evidence: string;
  affectedObjects: string[];
  explanation: string;
  proposedFix: string;
  risk: 'none' | 'low' | 'medium' | 'high';
  reversible: boolean;
  verificationMethod: string;
  category: 'system' | 'entities' | 'recorder' | 'automation' | 'security' | 'network' | 'backup';
  suggestedPatchYaml?: string;
  affectedFile?: string;
}

export interface SafeAction {
  id: string;
  title: string;
  description: string;
  category: string;
  targetFile: string;
  currentContent: string;
  proposedContent: string;
  diff: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'rolled_back';
  validationResult: {
    valid: boolean;
    errors?: string[];
  };
  backupId?: string;
  timestamp: string;
  appliedAt?: string;
}

export interface RollbackRecord {
  id: string;
  actionId: string;
  actionTitle: string;
  targetFile: string;
  restoredContent: string;
  timestamp: string;
}

export interface SystemHealth {
  score: number; // 0 - 100
  installationType: InstallationType;
  version: string;
  coreRunning: boolean;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  temperatureC?: number;
  dbSizeMb: number;
  recorderQueueLength: number;
  lastBackupDate?: string;
  integrationIssuesCount: number;
  unavailableEntitiesCount: number;
  flappingEntitiesCount: number;
  totalEntities: number;
  totalDevices: number;
  totalAutomations: number;
  uptimeSeconds: number;
}

export interface AdvisorRecommendation {
  id: string;
  problem: string;
  proposedCategory: string;
  suggestedHardware: string;
  requiredProtocol: 'zigbee' | 'zwave' | 'matter' | 'wifi' | 'ethernet' | 'bluetooth';
  localControl: '100% Local (Push)' | '100% Local (Poll)' | 'Local & Cloud Fallback' | 'Cloud Only';
  haCompatibility: 'Native (Home Assistant Recommended)' | 'ZHA / Zigbee2MQTT' | 'Community Integration';
  coordinatorRequirement?: string;
  powerType: 'Mains powered' | 'Battery (CR2032/CR2450)' | 'Battery (Rechargeable)' | 'PoE';
  privacyImpact: 'Ingen sky-tilkobling, privat lokal protokoll' | 'Lokal radio, ingen eksterne data';
  recommendedPlacement: string;
  priority: 'Høy' | 'Medium' | 'Lav';
  limitations: string;
}

export interface ImprovementItem {
  id: string;
  title: string;
  category:
    | 'Stabilitet'
    | 'Sikkerhet'
    | 'Tilgjengelighet'
    | 'Personvern'
    | 'Energieffektivitet'
    | 'Automasjonskvalitet'
    | 'Navnestandarder'
    | 'Områder'
    | 'Dashboards'
    | 'Backup'
    | 'Database & Recorder'
    | 'Nettverk & Radio';
  description: string;
  impact: number; // 1 - 5
  confidence: number; // 1 - 5
  safety: number; // 1 - 5
  effort: number; // 1 - 5
  score: number; // (impact * confidence * safety) / effort
  evidence: string;
  proposedYaml?: string;
}

export interface ConnectionConfig {
  url: string;
  token: string;
  isMock: boolean;
  mockProfile: 'green' | 'casaos' | 'rpi_core' | 'yellow_matter';
  tlsVerified?: boolean;
}
