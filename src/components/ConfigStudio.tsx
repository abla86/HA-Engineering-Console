import React, { useState, useEffect } from 'react';
import {
  Code2,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Sparkles,
  GitCompare,
  FileCode,
  ArrowRight,
  Eye,
  EyeOff,
  FolderArchive,
  Share2,
  Cpu,
  Layers,
  Check,
} from 'lucide-react';
import JSZip from 'jszip';
import { DiffLine } from '../../packages/config-engine/src/yaml-validator.js';
import { validateYaml, computeDiff, generateYaml, fetchTemplates, proposeAction } from '../services/api.js';
import { redactString } from '../../packages/shared/src/redact.js';
import { PRESET_TEMPLATES, YamlTemplate } from '../../packages/config-engine/src/template-generator.js';
import { ESPHomeManager } from './ESPHomeManager.js';

interface ConfigStudioProps {
  initialYaml?: string;
  initialFileName?: string;
  onActionStaged: () => void;
  defaultStudioMode?: 'yaml' | 'esphome';
}

export const ConfigStudio: React.FC<ConfigStudioProps> = ({
  initialYaml,
  initialFileName = 'automations.yaml',
  onActionStaged,
  defaultStudioMode = 'yaml',
}) => {
  const [studioMode, setStudioMode] = useState<'yaml' | 'esphome'>(
    initialFileName.includes('esphome') ? 'esphome' : defaultStudioMode
  );
  const [fileName, setFileName] = useState(initialFileName);
  const [yamlContent, setYamlContent] = useState(
    initialYaml ||
      `alias: 'Bevegelsesstyrt belysning Gang'
description: 'Slår på lyset ved bevegelse og av etter 3 minutter'
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
mode: restart
`
  );

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [activeView, setActiveView] = useState<'editor' | 'diff'>('editor');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: Array<{ line?: number; column?: number; message: string; field?: string }>;
  }>({ valid: true, errors: [] });

  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [originalYaml, setOriginalYaml] = useState(yamlContent);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareGistFeedback, setShareGistFeedback] = useState(false);

  // Validate on edit
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        let schemaType = 'configuration';
        if (fileName.includes('esphome') || yamlContent.includes('esphome:')) {
          schemaType = 'esphome';
        } else if (fileName.includes('automation') || yamlContent.includes('trigger:')) {
          schemaType = 'automation';
        } else if (fileName.includes('script') || yamlContent.includes('sequence:')) {
          schemaType = 'script';
        } else if (fileName.includes('mqtt') || yamlContent.includes('mqtt:')) {
          schemaType = 'mqtt';
        }

        const res = await validateYaml(yamlContent, schemaType);
        setValidation(res);
      } catch {
        // Ignore network error in debounce
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [yamlContent, fileName]);

  // Compute diff when switching to diff view
  const handleOpenDiff = async () => {
    try {
      const res = await computeDiff(originalYaml, yamlContent);
      setDiffLines(res.lines || []);
      setActiveView('diff');
    } catch (err: any) {
      alert(`Kunne ikke beregne diff: ${err.message}`);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await generateYaml(prompt);
      if (res.yaml) {
        setYamlContent(res.yaml);
        if (prompt.toLowerCase().includes('esphome') || prompt.toLowerCase().includes('esp32')) {
          setFileName('esphome/esp32_sensor.yaml');
        }
      }
    } catch (err: any) {
      alert(`Generering feilet: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = maskSecrets ? redactString(yamlContent) : yamlContent;
    navigator.clipboard.writeText(textToCopy);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleExportDownload = () => {
    const content = maskSecrets ? redactString(yamlContent) : yamlContent;
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('/', '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download entire repository / config folder as structured ZIP
  const handleDownloadFullZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // 1. Core configurations
      zip.file(
        'configuration.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[5].yaml) : PRESET_TEMPLATES[5].yaml
      );
      zip.file(
        'automations.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[2].yaml) : PRESET_TEMPLATES[2].yaml
      );
      zip.file(
        'scripts.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[6].yaml) : PRESET_TEMPLATES[6].yaml
      );
      zip.file(
        'packages/helpers.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[7].yaml) : PRESET_TEMPLATES[7].yaml
      );
      zip.file(
        'packages/mqtt_devices.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[9].yaml) : PRESET_TEMPLATES[9].yaml
      );

      // 2. ESPHome directory
      zip.file(
        'esphome/esp32_climate_proxy.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[0].yaml) : PRESET_TEMPLATES[0].yaml
      );
      zip.file(
        'esphome/mailbox_deep_sleep.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[1].yaml) : PRESET_TEMPLATES[1].yaml
      );

      // 3. Lovelace Dashboard
      zip.file(
        'dashboards/ui-lovelace.yaml',
        maskSecrets ? redactString(PRESET_TEMPLATES[8].yaml) : PRESET_TEMPLATES[8].yaml
      );

      // 4. Docker Compose
      zip.file(
        'docker-compose.yml',
        maskSecrets ? redactString(PRESET_TEMPLATES[10].yaml) : PRESET_TEMPLATES[10].yaml
      );

      // 5. secrets.yaml.example
      zip.file(
        'secrets.yaml.example',
        `# Home Assistant Secrets Template
# Rename this file to secrets.yaml on your host system
wifi_ssid: "MyHomeWiFi"
wifi_password: "MySecurePassword123"
fallback_ap_password: "EmergencyPassword"
esphome_api_encryption_key: "GENERATE_RANDOM_BASE64_KEY"
esphome_ota_password: "MyOtaPassword"
`
      );

      // 6. README for GitHub
      zip.file(
        'README.md',
        `# Home Assistant Production Configuration & ESPHome Bundle

Eksportert fra **HA Engineering Console**.

Inneholder:
- \`configuration.yaml\` med optimalisert recorder og proxy-oppsett
- \`automations.yaml\` med bevegelse, strømpris-peak og vannlekkasjevern
- \`esphome/\` ESP32 BLE Proxy og Deep-Sleep mikrokontroller-oppsett
- \`packages/\` MQTT og Helpers
- \`docker-compose.yml\` for containerisert drift
- \`secrets.yaml.example\` for sikker credential-håndtering
`
      );

      // Generate blob and download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'homeassistant-github-bundle.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Kunne ikke generere ZIP: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyMarkdownGist = () => {
    const content = maskSecrets ? redactString(yamlContent) : yamlContent;
    const gist = `\`\`\`yaml
# File: ${fileName}
# Generert av HA Engineering Console
${content}
\`\`\``;
    navigator.clipboard.writeText(gist);
    setShareGistFeedback(true);
    setTimeout(() => setShareGistFeedback(false), 2000);
  };

  const handleStageAction = async () => {
    try {
      await proposeAction({
        title: `Oppdater ${fileName}`,
        description: `Brukerevaluert endring i ${fileName} fra Configuration Studio`,
        category: fileName.includes('esphome')
          ? 'esphome'
          : fileName.includes('automation')
          ? 'automation'
          : 'configuration',
        targetFile: fileName,
        proposedContent: yamlContent,
        riskLevel: validation.valid ? 'low' : 'high',
      });
      alert(`Handlingen ble sendt til Safe Action Center! Du kan nå inspisere diff og bekrefte.`);
      onActionStaged();
    } catch (err: any) {
      alert(`Kunne ikke melde inn handling: ${err.message}`);
    }
  };

  const handleStageCustomAction = async (title: string, targetFile: string, proposedContent: string) => {
    try {
      await proposeAction({
        title,
        description: `ESPHome firmware konfigurasjon for ${targetFile}`,
        category: 'esphome',
        targetFile,
        proposedContent,
        riskLevel: 'low',
      });
      alert(`Handlingen '${title}' er sendt til Safe Action Center!`);
      onActionStaged();
    } catch (err: any) {
      alert(`Kunne ikke melde inn handling: ${err.message}`);
    }
  };

  const handleSelectTemplate = (tpl: YamlTemplate) => {
    setFileName(tpl.targetFile);
    setYamlContent(tpl.yaml);
    setOriginalYaml(tpl.yaml);
  };

  const filteredTemplates = PRESET_TEMPLATES.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  const lines = yamlContent.split('\n');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header and File Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-cyan-400" />
            Configuration Studio & Skjemakatalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Komplett støtte for ESPHome, automasjoner, helpers, lovelace-dashbord, MQTT og Docker Compose.
          </p>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveView(activeView === 'editor' ? 'diff' : 'editor')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeView === 'diff'
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{activeView === 'diff' ? 'Tilbake til Editor' : 'Vis Diff'}</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Del & GitHub</span>
          </button>

          <button
            onClick={handleDownloadFullZip}
            disabled={isZipping}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isZipping ? 'Pakker ZIP...' : 'Full HA ZIP-pakke'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copyFeedback ? 'Kopiert!' : 'Kopier'}</span>
          </button>

          <button
            onClick={handleExportDownload}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Last ned fil</span>
          </button>
        </div>
      </div>

      {/* Submode Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] p-2 rounded-xl border border-slate-800">
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg font-mono text-xs">
          <button
            onClick={() => setStudioMode('yaml')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              studioMode === 'yaml'
                ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            YAML Editor & Skjemaer
          </button>
          <button
            onClick={() => setStudioMode('esphome')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              studioMode === 'esphome'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESPHome Manager</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 px-2">
          {studioMode === 'yaml'
            ? 'Home Assistant konfigurasjon, automasjoner, dashboards og skjemavalidering'
            : 'ESPHome mikrokontrollere, kompilering og firmware for ESP32/ESP8266'}
        </div>
      </div>

      {studioMode === 'esphome' ? (
        <ESPHomeManager
          onOpenInConfigStudio={(yaml, fName) => {
            setYamlContent(yaml);
            setFileName(fName);
            setOriginalYaml(yaml);
            setStudioMode('yaml');
          }}
          onStageToSafeActionCenter={handleStageCustomAction}
        />
      ) : (
        <>
          {/* Template Preset Selector Carousel */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold uppercase text-slate-200">
              Forhåndsdefinerte Skjemaer & Integrasjoner
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            {['all', 'esphome', 'automation', 'configuration', 'script', 'helper', 'dashboard', 'mqtt', 'docker'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded uppercase transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Alle' : cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Template Pills Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {filteredTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 text-left transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                  {tpl.name}
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 shrink-0 ml-1">
                  {tpl.category}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-mono">
                {tpl.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Prompt Generator Bar */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg flex flex-col sm:flex-row items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Beskriv ønsket funksjon (f.eks: 'ESPHome BME280 klimasensor' eller 'Steng vannkran ved lekkasje')..."
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full"
          onKeyDown={(e) => e.key === 'Enter' && handleGeneratePrompt()}
        />
        <button
          onClick={handleGeneratePrompt}
          disabled={isGenerating}
          className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shrink-0 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? 'Genererer...' : 'Generer YAML'}
        </button>
      </div>

      {/* Editor & Diff View */}
      {activeView === 'editor' ? (
        <div className="rounded-xl border border-slate-800 bg-[#090d15] shadow-2xl overflow-hidden flex flex-col">
          {/* File Tab Bar */}
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-slate-500 text-[11px]">Aktiv fil:</span>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
                {fileName}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setMaskSecrets(!maskSecrets)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer text-[11px]"
              >
                {maskSecrets ? <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{maskSecrets ? 'Maskerer secrets' : 'Viser rådata'}</span>
              </button>
            </div>
          </div>

          {/* Line Numbers & Code Input */}
          <div className="flex font-mono text-xs min-h-[420px] max-h-[550px] overflow-hidden">
            {/* Line numbers gutter */}
            <div className="w-12 bg-slate-950/80 text-slate-600 p-3 select-none text-right border-r border-slate-900 leading-5">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={yamlContent}
              onChange={(e) => setYamlContent(e.target.value)}
              className="flex-1 bg-transparent p-3 text-slate-200 focus:outline-none resize-none leading-5 font-mono selection:bg-cyan-500/20"
              spellCheck={false}
            />
          </div>

          {/* Validation Status Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Syntaks & skjema er validert og fri for feil.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Valideringsfeil:{' '}
                    {validation.errors.map((e) => `[${e.field || 'YAML'}: ${e.message}]`).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleStageAction}
              disabled={!validation.valid}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
            >
              <span>Meld inn til Safe Action Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Diff Viewer */
        <div className="rounded-xl border border-slate-800 bg-[#090d15] shadow-2xl overflow-hidden font-mono text-xs">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400">
            <span>Viser diff mot opprinnelig konfigurasjon</span>
            <span className="text-[11px] text-cyan-400">+ Grønn = Lagt til, - Rød = Fjernet</span>
          </div>

          <div className="p-3 max-h-[450px] overflow-y-auto space-y-0.5">
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className={`px-2 py-0.5 rounded leading-relaxed flex items-start gap-2 ${
                  line.type === 'added'
                    ? 'bg-emerald-950/40 text-emerald-300 font-semibold border-l-2 border-emerald-500'
                    : line.type === 'removed'
                    ? 'bg-rose-950/40 text-rose-300 font-semibold border-l-2 border-rose-500 line-through opacity-80'
                    : 'text-slate-400'
                }`}
              >
                <span className="w-4 select-none opacity-50">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                <span className="flex-1 whitespace-pre">{line.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {/* GitHub Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col font-mono text-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Del Konfigurasjon på GitHub / Gist</span>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-slate-300 leading-relaxed">
                Her kan du eksportere konfigurasjonen din trygt til GitHub, Home Assistant Community eller et lokalt arkiv.
                Alle passord, tokens og private WiFi-nøkler maskeres automatisk.
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleCopyMarkdownGist}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-left flex items-center justify-between text-slate-200 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-cyan-300">Kopier som GitHub Markdown / Gist</div>
                    <div className="text-[11px] text-slate-400">Perfekt for GitHub Issues, Gists eller HA Community Forum</div>
                  </div>
                  {shareGistFeedback ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>

                <button
                  onClick={handleDownloadFullZip}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-left flex items-center justify-between text-slate-200 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-emerald-300">Last ned komplett GitHub ZIP-arkiv</div>
                    <div className="text-[11px] text-slate-400">Inneholder full mappestruktur, ESPHome, Lovelace og secrets.yaml.example</div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500">
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Secrets & passord er beskyttet
              </span>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-3 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
