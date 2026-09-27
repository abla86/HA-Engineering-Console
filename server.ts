import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { HAClient } from './packages/ha-client/src/ha-client.js';
import { runAllDiagnostics } from './packages/diagnostics/src/rules.js';
import { YamlEngine } from './packages/config-engine/src/yaml-validator.js';
import { generateYamlFromPrompt, PRESET_TEMPLATES } from './packages/config-engine/src/template-generator.js';
import { SafeExecutor } from './packages/config-engine/src/safe-executor.js';
import { generateRankedImprovements } from './packages/recommendation-engine/src/recommendations.js';
import { runDeviceAdvisor } from './packages/device-advisor/src/advisor.js';
import { redactJson, redactString } from './packages/shared/src/redact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Shared in-memory safe executor
  const safeExecutor = new SafeExecutor();

  // Active client session (defaults to mock green profile)
  let activeConfig = {
    url: 'http://homeassistant.local:8123',
    token: '',
    isMock: true,
    mockProfile: 'green' as const,
  };
  let activeClient = new HAClient(activeConfig);

  // --- API Endpoints ---

  // 1. Connection test & status
  app.post('/api/connection/test', async (req: Request, res: Response) => {
    try {
      const { url, token, isMock, mockProfile } = req.body;
      if (typeof isMock === 'boolean') activeConfig.isMock = isMock;
      if (mockProfile) activeConfig.mockProfile = mockProfile;
      if (url) activeConfig.url = url;
      if (token !== undefined) activeConfig.token = token;

      activeClient = new HAClient(activeConfig);
      const testResult = await activeClient.testConnection();
      res.json(testResult);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Tilkoblingstesten feilet' });
    }
  });

  // Switch mock profile
  app.post('/api/connection/profile', (req: Request, res: Response) => {
    const { profile } = req.body;
    if (['green', 'casaos', 'rpi_core', 'yellow_matter'].includes(profile)) {
      activeConfig.mockProfile = profile;
      activeConfig.isMock = true;
      activeClient.setMockProfile(profile);
      return res.json({ success: true, profile });
    }
    res.status(400).json({ error: 'Ugyldig profilnavn' });
  });

  // 2. System Health & Dashboard telemetry
  app.get('/api/ha/status', async (_req: Request, res: Response) => {
    try {
      const health = await activeClient.getHealth();
      res.json(health);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. States & Entities
  app.get('/api/ha/states', async (_req: Request, res: Response) => {
    try {
      const states = await activeClient.getStates();
      res.json(states);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Devices, Areas, Integrations, Logs, Repairs
  app.get('/api/ha/devices', async (_req: Request, res: Response) => {
    try {
      const devices = await activeClient.getDevices();
      res.json(devices);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ha/areas', async (_req: Request, res: Response) => {
    try {
      const areas = await activeClient.getAreas();
      res.json(areas);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ha/integrations', async (_req: Request, res: Response) => {
    try {
      const integrations = await activeClient.getIntegrations();
      res.json(integrations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ha/logs', async (_req: Request, res: Response) => {
    try {
      const logs = await activeClient.getLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ha/repairs', async (_req: Request, res: Response) => {
    try {
      const repairs = await activeClient.getRepairs();
      res.json(repairs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Config files
  app.get('/api/ha/config-files', async (_req: Request, res: Response) => {
    try {
      const configYaml = await activeClient.getRawConfigYaml();
      const automationsYaml = await activeClient.getAutomationsYaml();
      res.json({
        'configuration.yaml': configYaml,
        'automations.yaml': automationsYaml,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Diagnostics Engine
  app.get('/api/diagnostics/run', async (_req: Request, res: Response) => {
    try {
      const [states, devices, areas, integrations, health, configYaml, automationsYaml] = await Promise.all([
        activeClient.getStates(),
        activeClient.getDevices(),
        activeClient.getAreas(),
        activeClient.getIntegrations(),
        activeClient.getHealth(),
        activeClient.getRawConfigYaml(),
        activeClient.getAutomationsYaml(),
      ]);

      const findings = runAllDiagnostics({
        states,
        devices,
        areas,
        integrations,
        health,
        configYaml,
        automationsYaml,
        installationType: health.installationType,
      });

      res.json({
        total: findings.length,
        critical: findings.filter((f) => f.severity === 'critical').length,
        warning: findings.filter((f) => f.severity === 'warning').length,
        improvement: findings.filter((f) => f.severity === 'improvement').length,
        findings,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Recommendations Engine
  app.get('/api/recommendations', async (_req: Request, res: Response) => {
    try {
      const [states, devices, areas, integrations, health, configYaml, automationsYaml] = await Promise.all([
        activeClient.getStates(),
        activeClient.getDevices(),
        activeClient.getAreas(),
        activeClient.getIntegrations(),
        activeClient.getHealth(),
        activeClient.getRawConfigYaml(),
        activeClient.getAutomationsYaml(),
      ]);

      const items = generateRankedImprovements({
        states,
        devices,
        areas,
        integrations,
        health,
        configYaml,
        automationsYaml,
        installationType: health.installationType,
      });

      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Device Advisor
  app.get('/api/device-advisor', async (_req: Request, res: Response) => {
    try {
      const [states, devices, areas, integrations, health] = await Promise.all([
        activeClient.getStates(),
        activeClient.getDevices(),
        activeClient.getAreas(),
        activeClient.getIntegrations(),
        activeClient.getHealth(),
      ]);

      const advice = runDeviceAdvisor({
        states,
        devices,
        areas,
        integrations,
        health,
        installationType: health.installationType,
      });

      res.json(advice);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. YAML Engine: Validate, Diff, Generate
  app.post('/api/config/validate', (req: Request, res: Response) => {
    const { yaml: rawYaml, schemaType } = req.body;
    const result = YamlEngine.validate(rawYaml || '', schemaType || 'general');
    res.json(result);
  });

  app.post('/api/config/diff', (req: Request, res: Response) => {
    const { original, modified } = req.body;
    const diffResult = YamlEngine.computeDiff(original || '', modified || '');
    res.json(diffResult);
  });

  app.get('/api/config/templates', (_req: Request, res: Response) => {
    res.json(PRESET_TEMPLATES);
  });

  app.post('/api/config/generate', (req: Request, res: Response) => {
    const { prompt } = req.body;
    const generatedYaml = generateYamlFromPrompt(prompt || '');
    res.json({ yaml: generatedYaml });
  });

  // 10. Safe Action Center & Rollback
  app.post('/api/config/action/propose', (req: Request, res: Response) => {
    const { title, description, category, targetFile, proposedContent, riskLevel } = req.body;
    const action = safeExecutor.proposeAction({
      title,
      description,
      category,
      targetFile,
      proposedContent,
      riskLevel,
    });
    res.json(action);
  });

  app.post('/api/config/action/apply', (req: Request, res: Response) => {
    const { actionId } = req.body;
    const result = safeExecutor.applyAction(actionId);
    res.json(result);
  });

  app.post('/api/config/action/rollback', (req: Request, res: Response) => {
    const { rollbackId } = req.body;
    const result = safeExecutor.rollbackAction(rollbackId);
    res.json(result);
  });

  app.get('/api/config/actions', (_req: Request, res: Response) => {
    res.json({
      pending: safeExecutor.getPendingActions(),
      all: safeExecutor.getAllActions(),
      rollbacks: safeExecutor.getRollbackHistory(),
    });
  });

  // 11. Sanitized Export / Report
  app.post('/api/report/generate', async (req: Request, res: Response) => {
    try {
      const { anonymizeEntities } = req.body;
      const [states, health, findings] = await Promise.all([
        activeClient.getStates(),
        activeClient.getHealth(),
        activeClient.getStates().then(async (sts) => {
          const devs = await activeClient.getDevices();
          const ars = await activeClient.getAreas();
          const ints = await activeClient.getIntegrations();
          const hlth = await activeClient.getHealth();
          return runAllDiagnostics({
            states: sts,
            devices: devs,
            areas: ars,
            integrations: ints,
            health: hlth,
            installationType: hlth.installationType,
          });
        }),
      ]);

      const rawReport = {
        generatedAt: new Date().toISOString(),
        system: {
          installationType: health.installationType,
          version: health.version,
          score: health.score,
          cpuPercent: health.cpuPercent,
          memoryPercent: health.memoryPercent,
          diskPercent: health.diskPercent,
          totalEntities: states.length,
        },
        diagnosticsSummary: {
          criticalCount: findings.filter((f) => f.severity === 'critical').length,
          warningCount: findings.filter((f) => f.severity === 'warning').length,
          findings: findings.map((f) => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            evidence: f.evidence,
            explanation: f.explanation,
            proposedFix: f.proposedFix,
          })),
        },
      };

      const sanitized = redactJson(rawReport, anonymizeEntities ?? true);
      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Real-time Live Event Stream (SSE)
  app.get('/api/ha/events/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const intervalId = setInterval(() => {
      // Simulate live Home Assistant events
      const simulatedEvents = [
        {
          event_type: 'state_changed',
          entity_id: 'sensor.living_room_temperature',
          new_state: (21.2 + (Math.random() * 0.6 - 0.3)).toFixed(1),
          old_state: '21.4',
          unit: '°C',
        },
        {
          event_type: 'state_changed',
          entity_id: 'sensor.tibber_power_hourly',
          new_state: Math.floor(1700 + Math.random() * 300).toString(),
          old_state: '1850',
          unit: 'W',
        },
        {
          event_type: 'state_changed',
          entity_id: 'binary_sensor.hallway_motion',
          new_state: Math.random() > 0.6 ? 'on' : 'off',
          old_state: 'off',
        },
        {
          event_type: 'call_service',
          domain: 'light',
          service: 'turn_on',
          target: { entity_id: 'light.living_room_main_light' },
        },
      ];

      const ev = simulatedEvents[Math.floor(Math.random() * simulatedEvents.length)];
      res.write(`data: ${JSON.stringify({ ...ev, timestamp: new Date().toISOString() })}\n\n`);
    }, 4000);

    req.on('close', () => {
      clearInterval(intervalId);
    });
  });

  // --- Serve Frontend ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HA Engineering Console full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
