import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Download,
  Share2,
  Plus,
  Trash2,
  FileCode,
  Layers,
  Sparkles,
  Copy,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-react';
import { ESPHomeNode } from '../../packages/shared/src/types.js';
import {
  loadESPHomeNodes,
  saveESPHomeNodes,
  simulateCompilation,
  exportAllNodesZip,
  ESPHomeCompilationResult,
} from '../services/esphome.js';
import { YamlEngine } from '../../packages/config-engine/src/yaml-validator.js';
import { redactString } from '../../packages/shared/src/redact.js';

interface ESPHomeManagerProps {
  onOpenInConfigStudio: (yaml: string, fileName: string) => void;
  onStageToSafeActionCenter: (title: string, fileName: string, yaml: string) => void;
}

export const ESPHomeManager: React.FC<ESPHomeManagerProps> = ({
  onOpenInConfigStudio,
  onStageToSafeActionCenter,
}) => {
  const [nodes, setNodes] = useState<ESPHomeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'compiler' | 'features'>('editor');
  const [maskSecrets, setMaskSecrets] = useState<boolean>(true);
  const [compilationResult, setCompilationResult] = useState<ESPHomeCompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [isNewNodeModalOpen, setIsNewNodeModalOpen] = useState<boolean>(false);

  // New Node Wizard State
  const [newNodeName, setNewNodeName] = useState<string>('esp32-new-sensor');
  const [newNodeFriendly, setNewNodeFriendly] = useState<string>('Ny ESP32 Sensor');
  const [newNodePlatform, setNewNodePlatform] = useState<'esp32' | 'esp8266' | 'rp2040'>('esp32');
  const [newNodeTemplate, setNewNodeTemplate] = useState<string>('ble_proxy');

  useEffect(() => {
    const loaded = loadESPHomeNodes();
    setNodes(loaded);
    if (loaded.length > 0) {
      setSelectedNodeId(loaded[0].id);
    }
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleUpdateYaml = (newYaml: string) => {
    if (!selectedNode) return;
    const updated = nodes.map((n) => (n.id === selectedNode.id ? { ...n, yaml: newYaml } : n));
    setNodes(updated);
    saveESPHomeNodes(updated);
  };

  const handleCompile = () => {
    if (!selectedNode) return;
    setIsCompiling(true);
    setActiveTab('compiler');
    setTimeout(() => {
      const res = simulateCompilation(selectedNode);
      setCompilationResult(res);
      setIsCompiling(false);
    }, 600);
  };

  const handleExportZip = async () => {
    try {
      const blob = await exportAllNodesZip(nodes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'esphome-repository-bundle.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Kunne ikke generere ZIP: ${err.message}`);
    }
  };

  const handleCopyYaml = () => {
    if (!selectedNode) return;
    const text = maskSecrets ? redactString(selectedNode.yaml) : selectedNode.yaml;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleCreateNewNode = () => {
    if (!newNodeName.trim()) return;

    let baseYaml = '';
    if (newNodeTemplate === 'ble_proxy') {
      baseYaml = `esphome:
  name: ${newNodeName}
  friendly_name: "${newNodeFriendly}"

esp32:
  board: esp32dev
  framework:
    type: esp-idf

bluetooth_proxy:
  active: true

logger:

api:
  encryption:
    key: !secret esphome_api_encryption_key

ota:
  - platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password
`;
    } else if (newNodeTemplate === 'deep_sleep') {
      baseYaml = `esphome:
  name: ${newNodeName}
  friendly_name: "${newNodeFriendly}"

${newNodePlatform === 'esp32' ? 'esp32:\n  board: esp32dev' : 'esp8266:\n  board: d1_mini'}

logger:
  baud_rate: 0

api:

ota:
  - platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

deep_sleep:
  id: sleep_ctrl
  run_duration: 15s
  sleep_duration: 6h

binary_sensor:
  - platform: gpio
    pin:
      number: GPIO14
      mode: INPUT_PULLUP
      inverted: true
    name: "Sensor Aktiv"
`;
    } else {
      baseYaml = `esphome:
  name: ${newNodeName}
  friendly_name: "${newNodeFriendly}"

${newNodePlatform === 'esp32' ? 'esp32:\n  board: esp32dev' : 'esp8266:\n  board: d1_mini'}

logger:

api:

ota:
  - platform: esphome

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

switch:
  - platform: gpio
    name: "Relé Utgang"
    pin: GPIO12
`;
    }

    const newNode: ESPHomeNode = {
      id: `node_${Date.now()}`,
      name: newNodeName,
      friendly_name: newNodeFriendly,
      board: newNodePlatform === 'esp32' ? 'esp32dev' : 'd1_mini',
      platform: newNodePlatform,
      status: 'online',
      ip_address: `192.168.1.${Math.floor(100 + Math.random() * 90)}`,
      wifi_signal_dbm: -55,
      firmware_version: '2024.9.1',
      last_seen: new Date().toISOString(),
      features: [newNodeTemplate, 'ota', 'wifi'],
      fileName: `esphome/${newNodeName}.yaml`,
      yaml: baseYaml,
    };

    const updated = [...nodes, newNode];
    setNodes(updated);
    saveESPHomeNodes(updated);
    setSelectedNodeId(newNode.id);
    setIsNewNodeModalOpen(false);
  };

  const handleDeleteNode = (id: string) => {
    if (nodes.length <= 1) {
      alert('Kan ikke slette siste ESPHome node.');
      return;
    }
    if (!confirm('Er du sikker på at du vil fjerne denne ESPHome noden?')) return;
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    saveESPHomeNodes(updated);
    setSelectedNodeId(updated[0].id);
  };

  const validation = selectedNode ? YamlEngine.validate(selectedNode.yaml, 'esphome') : { valid: true, errors: [] };
  const lines = selectedNode ? selectedNode.yaml.split('\n') : [];

  return (
    <div className="space-y-5">
      {/* Top Bar for ESPHome Manager */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
              ESPHome Node Manager & Firmware Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Administrer mikrokontrollere (ESP32, ESP8266, RP2040), Bluetooth Proxies og sensorer direkte.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsNewNodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ny ESPHome Node</span>
          </button>

          <button
            onClick={handleExportZip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-emerald-300 font-semibold transition-colors cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Eksporter Alt (GitHub ZIP)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Node Cards + Node Inspector/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Nodes List */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between font-semibold">
            <span>Tilkoblede Noder ({nodes.length})</span>
            <span className="text-emerald-400">OTA Klar</span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isGoodSignal = (node.wifi_signal_dbm || -70) > -65;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 font-mono ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                      : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-slate-100">{node.friendly_name}</span>
                    </div>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-cyan-300 border border-slate-800">
                      {node.platform.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>IP: {node.ip_address || 'DHCP'}</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Wifi className={`w-3 h-3 ${isGoodSignal ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span>{node.wifi_signal_dbm} dBm</span>
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 truncate">{node.fileName}</div>

                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                    {node.features.map((feat) => (
                      <span
                        key={feat}
                        className="px-1.5 py-0.2 rounded text-[9px] bg-slate-950 text-slate-400 border border-slate-800"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Node Workspace */}
        {selectedNode && (
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#090d15] shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Node Header & Action Controls */}
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">{selectedNode.friendly_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                    {selectedNode.board}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Fil: {selectedNode.fileName}</div>
              </div>

              {/* Node actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCompile}
                  disabled={isCompiling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer shadow-md"
                >
                  <Play className={`w-3.5 h-3.5 ${isCompiling ? 'animate-spin' : ''}`} />
                  <span>{isCompiling ? 'Kompilerer...' : 'Kompiler & Valider'}</span>
                </button>

                <button
                  onClick={() =>
                    onStageToSafeActionCenter(
                      `Oppdater ${selectedNode.friendly_name}`,
                      selectedNode.fileName,
                      selectedNode.yaml
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 text-cyan-300 transition-colors cursor-pointer"
                  title="Meld inn til Safe Action Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Meld til Action Center</span>
                </button>

                <button
                  onClick={handleCopyYaml}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Kopier YAML"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-900 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer"
                  title="Slett node"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="px-4 py-1.5 bg-slate-950/80 border-b border-slate-900 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === 'editor'
                      ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  YAML Editor
                </button>
                <button
                  onClick={() => setActiveTab('compiler')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    activeTab === 'compiler'
                      ? 'bg-slate-800 text-emerald-300 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kompilator & Logg
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaskSecrets(!maskSecrets)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-[11px] cursor-pointer"
                >
                  {maskSecrets ? <EyeOff className="w-3 h-3 text-cyan-400" /> : <Eye className="w-3 h-3" />}
                  <span>{maskSecrets ? 'Secrets maskert' : 'Vis rådata'}</span>
                </button>
              </div>
            </div>

            {/* Tab 1: YAML Editor */}
            {activeTab === 'editor' && (
              <div className="flex font-mono text-xs min-h-[380px] max-h-[500px] overflow-hidden">
                <div className="w-12 bg-slate-950/80 text-slate-600 p-3 select-none text-right border-r border-slate-900 leading-5">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={selectedNode.yaml}
                  onChange={(e) => handleUpdateYaml(e.target.value)}
                  className="flex-1 bg-transparent p-3 text-slate-200 focus:outline-none resize-none leading-5 font-mono selection:bg-cyan-500/20"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Tab 2: Compiler & Logs */}
            {activeTab === 'compiler' && (
              <div className="p-4 space-y-4 font-mono text-xs min-h-[380px] max-h-[500px] overflow-y-auto">
                {compilationResult ? (
                  <div className="space-y-4">
                    {/* Memory Consumption Progress Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                          <span>RAM Allokering:</span>
                          <span className="text-cyan-300 font-bold">{compilationResult.ramUsagePercent}%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${compilationResult.ramUsagePercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {compilationResult.ramBytes} bytes brukt
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                          <span>Flash Minnebruk:</span>
                          <span className="text-emerald-300 font-bold">{compilationResult.flashUsagePercent}%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${compilationResult.flashUsagePercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {compilationResult.flashBytes} bytes brukt
                        </div>
                      </div>
                    </div>

                    {/* Compiler Terminal Output */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Kompilatorkonsoll (PlatformIO Build Pipeline)</span>
                      </div>
                      <div className="space-y-0.5 max-h-56 overflow-y-auto text-[11px] text-slate-300 leading-relaxed pt-1">
                        {compilationResult.compilerLog.map((logLine, idx) => (
                          <div
                            key={idx}
                            className={
                              logLine.includes('SUCCESS')
                                ? 'text-emerald-400 font-bold'
                                : logLine.includes('ERROR')
                                ? 'text-rose-400 font-bold'
                                : logLine.includes('WARNING')
                                ? 'text-amber-400'
                                : 'text-slate-400'
                            }
                          >
                            {logLine}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Terminal className="w-6 h-6 mx-auto text-slate-600" />
                    <div>Trykk "Kompiler & Valider" for å bygge firmware og analysere minneallokering.</div>
                  </div>
                )}
              </div>
            )}

            {/* Node Footer Status */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ESPHome syntaks og komponenter er gyldige.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Feil: {validation.errors.map((e) => e.message).join(', ')}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onOpenInConfigStudio(selectedNode.yaml, selectedNode.fileName)}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
              >
                <span>Åpne i full Configuration Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Node Modal Wizard */}
      {isNewNodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col font-mono text-xs">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Legg til ny ESPHome Node</span>
              </div>
              <button
                onClick={() => setIsNewNodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-slate-400 mb-1">Teknisk Nodenavn (små bokstaver og bindestrek):</label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Brukervennlig Navn i Home Assistant:</label>
                <input
                  type="text"
                  value={newNodeFriendly}
                  onChange={(e) => setNewNodeFriendly(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Plattform / SoC:</label>
                  <select
                    value={newNodePlatform}
                    onChange={(e: any) => setNewNodePlatform(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="esp32">ESP32 (Standard / Dual-Core)</option>
                    <option value="esp8266">ESP8266 / D1 Mini</option>
                    <option value="rp2040">Raspberry Pi RP2040</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Forhåndsdefinert Funksjon:</label>
                  <select
                    value={newNodeTemplate}
                    onChange={(e) => setNewNodeTemplate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="ble_proxy">Bluetooth Proxy & Sensor</option>
                    <option value="deep_sleep">Batteridrevet Deep Sleep</option>
                    <option value="relay">Smartplugg & Relé</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewNodeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 cursor-pointer hover:bg-slate-800"
              >
                Avbryt
              </button>
              <button
                onClick={handleCreateNewNode}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer transition-colors"
              >
                Opprett Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
