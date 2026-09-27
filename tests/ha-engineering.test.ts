import { test, describe } from 'node:test';
import assert from 'node:assert';
import { HAClient } from '../packages/ha-client/src/ha-client.js';
import { runAllDiagnostics } from '../packages/diagnostics/src/rules.js';
import { YamlEngine } from '../packages/config-engine/src/yaml-validator.js';
import { SafeExecutor } from '../packages/config-engine/src/safe-executor.js';
import { redactJson, redactString } from '../packages/shared/src/redact.js';
import { generateRankedImprovements } from '../packages/recommendation-engine/src/recommendations.js';
import { runDeviceAdvisor } from '../packages/device-advisor/src/advisor.js';
import { generateYamlFromPrompt } from '../packages/config-engine/src/template-generator.js';

describe('HA Engineering Console Test Suite', () => {
  // 1. Connection & Mock Adapters
  describe('Connection Center & Adapter Capabilities', () => {
    test('Mock Green instance connects and returns valid capability matrix', async () => {
      const client = new HAClient({
        url: 'http://homeassistant.local:8123',
        isMock: true,
        mockProfile: 'green',
      });

      const res = await client.testConnection();
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.installationType, 'green');
      assert.strictEqual(res.capabilities.supervisor, true);
      assert.strictEqual(res.capabilities.backups, true);
      assert.strictEqual(res.capabilities.zigbee, true);
    });

    test('Mock CasaOS Container instance reports supervisor as false', async () => {
      const client = new HAClient({
        url: 'http://casaos.local:8123',
        isMock: true,
        mockProfile: 'casaos',
      });

      const res = await client.testConnection();
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.installationType, 'casaos');
      assert.strictEqual(res.capabilities.supervisor, false);
      assert.strictEqual(res.capabilities.backups, false);
    });

    test('Detects TLS insecure on plain http:// URLs', async () => {
      const client = new HAClient({
        url: 'http://192.168.1.100:8123',
        isMock: true,
        mockProfile: 'green',
      });
      const res = await client.testConnection();
      assert.strictEqual(res.tlsSecure, false);

      const httpsClient = new HAClient({
        url: 'https://myha.duckdns.org:8123',
        isMock: true,
        mockProfile: 'green',
      });
      const resHttps = await httpsClient.testConnection();
      assert.strictEqual(resHttps.tlsSecure, true);
    });
  });

  // 2. Evidence-based Diagnostics Rules
  describe('System Doctor & Diagnostics Engine', () => {
    test('Rule: Critically low battery (<15%) triggers warning/critical with exact evidence', async () => {
      const client = new HAClient({ url: 'http://test', isMock: true, mockProfile: 'green' });
      const [states, devices, areas, integrations, health, configYaml, automationsYaml] = await Promise.all([
        client.getStates(),
        client.getDevices(),
        client.getAreas(),
        client.getIntegrations(),
        client.getHealth(),
        client.getRawConfigYaml(),
        client.getAutomationsYaml(),
      ]);

      const findings = runAllDiagnostics({
        states,
        devices,
        areas,
        integrations,
        health,
        configYaml,
        automationsYaml,
        installationType: 'green',
      });

      const batteryFinding = findings.find((f) => f.id.includes('crit_battery'));
      assert.ok(batteryFinding, 'Should detect low battery on Aqara sensor');
      assert.strictEqual(batteryFinding.severity, 'warning');
      assert.match(batteryFinding.evidence, /11%/);
    });

    test('Rule: Unavailable and dead automation triggers detected', async () => {
      const client = new HAClient({ url: 'http://test', isMock: true, mockProfile: 'green' });
      const [states, devices, areas, integrations, health, configYaml, automationsYaml] = await Promise.all([
        client.getStates(),
        client.getDevices(),
        client.getAreas(),
        client.getIntegrations(),
        client.getHealth(),
        client.getRawConfigYaml(),
        client.getAutomationsYaml(),
      ]);

      const findings = runAllDiagnostics({
        states,
        devices,
        areas,
        integrations,
        health,
        configYaml,
        automationsYaml,
        installationType: 'green',
      });

      const deadAuto = findings.find((f) => f.id.includes('dead_auto'));
      assert.ok(deadAuto, 'Should detect automation pointing to unavailable sensor');
      assert.strictEqual(deadAuto.severity, 'critical');
      assert.ok(deadAuto.affectedObjects.includes('sensor.old_garage_door_sensor'));
    });

    test('Rule: Automation mode single with delay triggers race condition warning', async () => {
      const client = new HAClient({ url: 'http://test', isMock: true, mockProfile: 'green' });
      const [states, devices, areas, integrations, health, configYaml, automationsYaml] = await Promise.all([
        client.getStates(),
        client.getDevices(),
        client.getAreas(),
        client.getIntegrations(),
        client.getHealth(),
        client.getRawConfigYaml(),
        client.getAutomationsYaml(),
      ]);

      const findings = runAllDiagnostics({
        states,
        devices,
        areas,
        integrations,
        health,
        configYaml,
        automationsYaml,
        installationType: 'green',
      });

      const raceCondition = findings.find((f) => f.id === 'automation_mode_single_delay');
      assert.ok(raceCondition, 'Should detect race condition on mode: single + delay');
      assert.ok(raceCondition.suggestedPatchYaml?.includes('mode: restart'));
    });
  });

  // 3. YAML Validation, Diffing & Templates
  describe('Configuration Studio YAML Engine', () => {
    test('Validates correct automation YAML without errors', () => {
      const validYaml = `
alias: Test automation
trigger:
  - platform: state
    entity_id: binary_sensor.motion
    to: 'on'
action:
  - service: light.turn_on
    target:
      entity_id: light.living_room
mode: single
`;
      const res = YamlEngine.validate(validYaml, 'automation');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    test('Flags syntax error with line and column in broken YAML', () => {
      const brokenYaml = `
alias: Broken yaml
trigger:
  - platform: state
  bad_indent: 12
    illegal_tab: \t123
`;
      const res = YamlEngine.validate(brokenYaml, 'automation');
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.length > 0);
      assert.ok(res.errors[0].message);
    });

    test('Detects missing action in automation schema', () => {
      const missingAction = `
alias: Incomplete
trigger:
  - platform: state
    entity_id: binary_sensor.door
`;
      const res = YamlEngine.validate(missingAction, 'automation');
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some((e) => e.field === 'action'));
    });

    test('Computes line-by-line diff between two configurations', () => {
      const original = `default_config:
recorder:
  purge_keep_days: 10
`;
      const modified = `default_config:
recorder:
  purge_keep_days: 7
  auto_purge: true
`;
      const { diffText, lines } = YamlEngine.computeDiff(original, modified);
      assert.ok(diffText.includes('-  purge_keep_days: 10'));
      assert.ok(diffText.includes('+  purge_keep_days: 7'));
      assert.ok(lines.some((l) => l.type === 'removed' && l.content.includes('10')));
      assert.ok(lines.some((l) => l.type === 'added' && l.content.includes('7')));
    });

    test('Validates and generates ESPHome firmware configuration', () => {
      const esphomePrompt = 'Lag en ESPHome esp32 klimasensor med BME280';
      const yaml = generateYamlFromPrompt(esphomePrompt);
      assert.ok(yaml.includes('esp32:'));
      assert.ok(yaml.includes('bme280'));

      const val = YamlEngine.validate(yaml, 'esphome');
      assert.strictEqual(val.valid, true);

      // Broken ESPHome without wifi
      const brokenEsp = `esphome:\n  name: test\nesp32:\n  board: esp32dev\n`;
      const brokenVal = YamlEngine.validate(brokenEsp, 'esphome');
      assert.strictEqual(brokenVal.valid, false);
      assert.ok(brokenVal.errors.some((e) => e.field === 'network'));
    });
  });

  // 4. Safe Action Center & Atomic Rollback
  describe('Safe Action Center & Rollback', () => {
    test('Proposes action, refuses applying invalid YAML, applies valid YAML with backup, and rolls back cleanly', () => {
      const executor = new SafeExecutor();

      // Propose invalid
      const invalidAction = executor.proposeAction({
        title: 'Broken action',
        description: 'Test invalid',
        category: 'test',
        targetFile: 'automations.yaml',
        proposedContent: 'alias: broken\n  bad indentation: true\n',
      });
      assert.strictEqual(invalidAction.validationResult.valid, false);

      const applyFailed = executor.applyAction(invalidAction.id);
      assert.strictEqual(applyFailed.success, false);
      assert.match(applyFailed.message, /feilet/);

      // Propose valid
      const validYaml = `- id: '999'
  alias: 'Test Auto'
  trigger:
    - platform: state
      entity_id: binary_sensor.hallway_motion
  action:
    - service: light.turn_on
`;
      const validAction = executor.proposeAction({
        title: 'Add safe automation',
        description: 'Test safe apply',
        category: 'automation',
        targetFile: 'automations.yaml',
        proposedContent: validYaml,
      });
      assert.strictEqual(validAction.validationResult.valid, true);

      // Apply valid
      const applyResult = executor.applyAction(validAction.id);
      assert.strictEqual(applyResult.success, true);
      assert.strictEqual(executor.getFileContent('automations.yaml'), validYaml);

      // Rollback
      const rollbacks = executor.getRollbackHistory();
      assert.ok(rollbacks.length > 0);
      const rbResult = executor.rollbackAction(rollbacks[0].id);
      assert.strictEqual(rbResult.success, true);
      assert.notStrictEqual(executor.getFileContent('automations.yaml'), validYaml);
    });
  });

  // 5. Secret Redaction
  describe('Redaction & Privacy Masking', () => {
    test('Redacts Bearer tokens, secrets, passwords and GPS coordinates', () => {
      const sample = `
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIn0.abcdef12345
token: abcdef1234567890abcdef1234567890
password: MySecretPassword123
latitude: 59.9139
longitude: 10.7522
webhook_id: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
`;
      const cleaned = redactString(sample);
      assert.ok(!cleaned.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
      assert.ok(!cleaned.includes('MySecretPassword123'));
      assert.ok(!cleaned.includes('59.9139'));
      assert.ok(!cleaned.includes('10.7522'));
      assert.ok(!cleaned.includes('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'));
      assert.ok(cleaned.includes('[REDACTED_TOKEN]'));
      assert.ok(cleaned.includes('[REDACTED_LAT]'));
      assert.ok(cleaned.includes('[REDACTED_LON]'));
    });

    test('Redacts JSON structure and optionally anonymizes entities', () => {
      const data = {
        user: 'admin',
        token: 'abcdef123456789012345678901234567890',
        latitude: 59.91,
        entities: ['person.olav_nordmann', 'light.kitchen'],
      };
      const redacted = redactJson(data, true);
      assert.strictEqual(redacted.token, '[REDACTED_TOKEN]');
      assert.strictEqual(redacted.entities[0], 'person.user_anonymized');
    });
  });

  // 6. Recommendation & Device Advisor Engine
  describe('Recommendation & Device Advisor Engines', () => {
    test('Scores improvements using (impact * confidence * safety) / effort', async () => {
      const client = new HAClient({ url: 'http://test', isMock: true, mockProfile: 'green' });
      const [states, devices, areas, integrations, health] = await Promise.all([
        client.getStates(),
        client.getDevices(),
        client.getAreas(),
        client.getIntegrations(),
        client.getHealth(),
      ]);

      const items = generateRankedImprovements({
        states,
        devices,
        areas,
        integrations,
        health,
        installationType: 'green',
      });

      assert.ok(items.length > 0);
      // Verify items are sorted descending by score
      for (let i = 0; i < items.length - 1; i++) {
        assert.ok(items[i].score >= items[i + 1].score, `Item ${i} score should be >= item ${i+1}`);
      }
    });

    test('Device Advisor suggests water leak detector when wet areas lack sensors', async () => {
      const client = new HAClient({ url: 'http://test', isMock: true, mockProfile: 'green' });
      const [states, devices, areas, integrations, health] = await Promise.all([
        client.getStates(),
        client.getDevices(),
        client.getAreas(),
        client.getIntegrations(),
        client.getHealth(),
      ]);

      const advice = runDeviceAdvisor({
        states,
        devices,
        areas,
        integrations,
        health,
        installationType: 'green',
      });

      const waterAdvice = advice.find((a) => a.id === 'adv_water_leak');
      assert.ok(waterAdvice, 'Should suggest water leak sensor for unmonitored kitchen/bathroom');
      assert.strictEqual(waterAdvice.requiredProtocol, 'zigbee');
      assert.strictEqual(waterAdvice.localControl, '100% Local (Push)');
    });
  });

  // 7. ESPHome Node Manager & Repository Export
  describe('ESPHome Manager & Repository Export', () => {
    test('Simulates compilation, RAM/Flash metrics and PlatformIO pipeline', async () => {
      const { INITIAL_ESPHOME_NODES, simulateCompilation, exportAllNodesZip } = await import(
        '../src/services/esphome.js'
      );

      const bleNode = INITIAL_ESPHOME_NODES[0];
      assert.strictEqual(bleNode.platform, 'esp32');

      const compResult = simulateCompilation(bleNode);
      assert.strictEqual(compResult.success, true);
      assert.ok(compResult.ramUsagePercent > 0 && compResult.ramUsagePercent <= 100);
      assert.ok(compResult.flashUsagePercent > 0 && compResult.flashUsagePercent <= 100);
      assert.ok(compResult.compilerLog.some((l) => l.includes('SUCCESS')));

      // Test repository zip generation
      const zipBlob = await exportAllNodesZip(INITIAL_ESPHOME_NODES);
      assert.ok(zipBlob.size > 100, 'Zip blob should contain packaged nodes');
    });
  });
});
