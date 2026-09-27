import {
  AdvisorRecommendation,
  ConnectionConfig,
  Finding,
  HAArea,
  HADevice,
  HAIntegration,
  HAState,
  ImprovementItem,
  RollbackRecord,
  SafeAction,
  SystemHealth,
} from '../../packages/shared/src/types.js';

export const API_BASE = '';

export async function testConnection(params: {
  url?: string;
  token?: string;
  isMock: boolean;
  mockProfile?: string;
}) {
  const resp = await fetch(`${API_BASE}/api/connection/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await resp.json();
}

export async function setMockProfile(profile: string) {
  const resp = await fetch(`${API_BASE}/api/connection/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });
  return await resp.json();
}

export async function fetchSystemStatus(): Promise<SystemHealth> {
  const resp = await fetch(`${API_BASE}/api/ha/status`);
  if (!resp.ok) throw new Error('Kunne ikke hente systemstatus');
  return await resp.json();
}

export async function fetchStates(): Promise<HAState[]> {
  const resp = await fetch(`${API_BASE}/api/ha/states`);
  if (!resp.ok) throw new Error('Kunne ikke hente states');
  return await resp.json();
}

export async function fetchDevices(): Promise<HADevice[]> {
  const resp = await fetch(`${API_BASE}/api/ha/devices`);
  if (!resp.ok) throw new Error('Kunne ikke hente enheter');
  return await resp.json();
}

export async function fetchAreas(): Promise<HAArea[]> {
  const resp = await fetch(`${API_BASE}/api/ha/areas`);
  if (!resp.ok) throw new Error('Kunne ikke hente områder');
  return await resp.json();
}

export async function fetchIntegrations(): Promise<HAIntegration[]> {
  const resp = await fetch(`${API_BASE}/api/ha/integrations`);
  if (!resp.ok) throw new Error('Kunne ikke hente integrasjoner');
  return await resp.json();
}

export async function fetchLogs() {
  const resp = await fetch(`${API_BASE}/api/ha/logs`);
  return await resp.json();
}

export async function fetchRepairs() {
  const resp = await fetch(`${API_BASE}/api/ha/repairs`);
  return await resp.json();
}

export async function fetchConfigFiles(): Promise<Record<string, string>> {
  const resp = await fetch(`${API_BASE}/api/ha/config-files`);
  return await resp.json();
}

export async function runDiagnostics(): Promise<{
  total: number;
  critical: number;
  warning: number;
  improvement: number;
  findings: Finding[];
}> {
  const resp = await fetch(`${API_BASE}/api/diagnostics/run`);
  if (!resp.ok) throw new Error('Diagnostisk analyse feilet');
  return await resp.json();
}

export async function fetchRecommendations(): Promise<ImprovementItem[]> {
  const resp = await fetch(`${API_BASE}/api/recommendations`);
  return await resp.json();
}

export async function fetchDeviceAdvisor(): Promise<AdvisorRecommendation[]> {
  const resp = await fetch(`${API_BASE}/api/device-advisor`);
  return await resp.json();
}

export async function validateYaml(rawYaml: string, schemaType: string = 'general') {
  const resp = await fetch(`${API_BASE}/api/config/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml: rawYaml, schemaType }),
  });
  return await resp.json();
}

export async function computeDiff(original: string, modified: string) {
  const resp = await fetch(`${API_BASE}/api/config/diff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original, modified }),
  });
  return await resp.json();
}

export async function generateYaml(prompt: string) {
  const resp = await fetch(`${API_BASE}/api/config/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  return await resp.json();
}

export async function fetchTemplates() {
  const resp = await fetch(`${API_BASE}/api/config/templates`);
  return await resp.json();
}

export async function proposeAction(payload: {
  title: string;
  description: string;
  category: string;
  targetFile: string;
  proposedContent: string;
  riskLevel?: 'low' | 'medium' | 'high';
}): Promise<SafeAction> {
  const resp = await fetch(`${API_BASE}/api/config/action/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await resp.json();
}

export async function applyAction(actionId: string): Promise<{ success: boolean; message: string; action?: SafeAction }> {
  const resp = await fetch(`${API_BASE}/api/config/action/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId }),
  });
  return await resp.json();
}

export async function rollbackAction(rollbackId: string): Promise<{ success: boolean; message: string }> {
  const resp = await fetch(`${API_BASE}/api/config/action/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollbackId }),
  });
  return await resp.json();
}

export async function fetchActions(): Promise<{
  pending: SafeAction[];
  all: SafeAction[];
  rollbacks: RollbackRecord[];
}> {
  const resp = await fetch(`${API_BASE}/api/config/actions`);
  return await resp.json();
}

export async function generateReport(anonymizeEntities: boolean = true) {
  const resp = await fetch(`${API_BASE}/api/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonymizeEntities }),
  });
  return await resp.json();
}
