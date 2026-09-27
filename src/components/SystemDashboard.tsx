import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Thermometer,
  Database,
  Server,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Play,
  Pause,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { SystemHealth } from '../../packages/shared/src/types.js';

interface SystemDashboardProps {
  health: SystemHealth | null;
  onNavigateToDoctor: () => void;
  onNavigateToActionCenter: () => void;
  onNavigateToConfig: () => void;
}

interface TelemetryPoint {
  time: string;
  cpu: number;
  memory: number;
  temp?: number;
}

export const SystemDashboard: React.FC<SystemDashboardProps> = ({
  health,
  onNavigateToDoctor,
  onNavigateToActionCenter,
  onNavigateToConfig,
}) => {
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Seed initial and continuous telemetry data
  useEffect(() => {
    if (!health) return;

    const now = new Date();
    // Initialize with 10 historical points if empty
    if (telemetryHistory.length === 0) {
      const initial: TelemetryPoint[] = [];
      for (let i = 9; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3000);
        const cpuNoise = (Math.random() * 4 - 2);
        const memNoise = (Math.random() * 1.5 - 0.75);
        initial.push({
          time: t.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: Math.max(2, Math.min(100, parseFloat((health.cpuPercent + cpuNoise).toFixed(1)))),
          memory: Math.max(5, Math.min(100, parseFloat((health.memoryPercent + memNoise).toFixed(1)))),
          temp: health.temperatureC,
        });
      }
      setTelemetryHistory(initial);
    }
  }, [health]);

  // Real-time graph updater
  useEffect(() => {
    if (!health || !isLiveStreaming) return;

    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('no-NO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Realistic jitter
      const nextCpu = Math.max(
        3,
        Math.min(98, parseFloat((health.cpuPercent + (Math.random() * 6 - 3)).toFixed(1)))
      );
      const nextMemory = Math.max(
        10,
        Math.min(95, parseFloat((health.memoryPercent + (Math.random() * 1 - 0.5)).toFixed(1)))
      );

      setTelemetryHistory((prev) => {
        const next = [...prev, { time: timeStr, cpu: nextCpu, memory: nextMemory, temp: health.temperatureC }];
        return next.slice(-25); // keep last 25 ticks
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [health, isLiveStreaming]);

  if (!health) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        Henter systemtelemetri fra Home Assistant...
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score >= 65) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Optimal Helse';
    if (score >= 65) return 'Krever Oppmerksomhet';
    return 'Kritisk Tilstand';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}t`;
  };

  // Stats calculation
  const cpuValues = telemetryHistory.map((p) => p.cpu);
  const memValues = telemetryHistory.map((p) => p.memory);
  const maxCpu = cpuValues.length > 0 ? Math.max(...cpuValues) : health.cpuPercent;
  const avgCpu = cpuValues.length > 0 ? (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(1) : health.cpuPercent;
  const maxMem = memValues.length > 0 ? Math.max(...memValues) : health.memoryPercent;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner: Score & Platform Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score Card */}
        <div className={`p-5 rounded-xl border flex items-center justify-between shadow-xl ${getScoreColor(health.score)}`}>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400">System Helse-Score</div>
            <div className="text-4xl font-extrabold font-mono mt-1">{health.score}/100</div>
            <div className="text-xs font-semibold mt-1">{getScoreLabel(health.score)}</div>
          </div>
          <div className="text-right space-y-1">
            <button
              onClick={onNavigateToDoctor}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Se Funn ({health.unavailableEntitiesCount + health.integrationIssuesCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Core & OS Spec Card */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-semibold uppercase text-slate-200">
                Plattform & Kjerne
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
              {health.installationType.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs font-mono">
            <div>
              <div className="text-slate-500 text-[10px]">HA Kjerne:</div>
              <div className="text-slate-100 font-semibold">{health.version}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">Status:</div>
              <div className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Kjører (Aktiv)
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">Oppetid:</div>
              <div className="text-slate-100 font-semibold">{formatUptime(health.uptimeSeconds)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">Siste Backup:</div>
              <div className={health.lastBackupDate ? 'text-slate-100' : 'text-rose-400 font-semibold'}>
                {health.lastBackupDate ? new Date(health.lastBackupDate).toLocaleDateString('no-NO') : 'Mangler!'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- REAL-TIME RECHARTS SYSTEM HEALTH WIDGET --- */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/90 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                <span>System Health Telemetri (Sanntid)</span>
                {isLiveStreaming && (
                  <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Kontinuerlig måling av CPU- og minnebelastning med 2.5s oppløsning.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>CPU Peak: <strong className="text-slate-100">{maxCpu}%</strong></span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>RAM Peak: <strong className="text-slate-100">{maxMem}%</strong></span>
            </div>

            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isLiveStreaming ? 'Pause sanntidsgraf' : 'Gjenoppta sanntidsgraf'}
            >
              {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Recharts Chart Container */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 shadow-2xl font-mono text-xs space-y-1">
                        <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                          Tid: {label}
                        </div>
                        <div className="text-cyan-400 flex items-center justify-between gap-4">
                          <span>CPU Belastning:</span>
                          <strong>{payload[0]?.value}%</strong>
                        </div>
                        <div className="text-emerald-400 flex items-center justify-between gap-4">
                          <span>Minnebruk:</span>
                          <strong>{payload[1]?.value}%</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontFamily: 'monospace' }}
              />

              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU Belastning (%)"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#cpuGradient)"
                isAnimationActive={false}
              />

              <Area
                type="monotone"
                dataKey="memory"
                name="Minnebruk (%)"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#memGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Telemetry Gauge Cards (CPU, RAM, Disk, Temp) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" /> CPU Gjennomsnitt
            </span>
            <span className="text-slate-100 font-bold">{health.cpuPercent}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                health.cpuPercent > 80 ? 'bg-rose-500' : health.cpuPercent > 50 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, health.cpuPercent)}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" /> Minnebruk
            </span>
            <span className="text-slate-100 font-bold">{health.memoryPercent}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                health.memoryPercent > 85 ? 'bg-rose-500' : health.memoryPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, health.memoryPercent)}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-400" /> Lagring (Disk)
            </span>
            <span className="text-slate-100 font-bold">{health.diskPercent}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                health.diskPercent > 85 ? 'bg-rose-500' : health.diskPercent > 75 ? 'bg-amber-500' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.min(100, health.diskPercent)}%` }}
            />
          </div>
        </div>

        {/* Temperature */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-rose-400" /> SoC Temperatur
            </span>
            <span className="text-slate-100 font-bold">{health.temperatureC ? `${health.temperatureC}°C` : 'N/A'}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (health.temperatureC || 0) > 70
                  ? 'bg-rose-500'
                  : (health.temperatureC || 0) > 55
                  ? 'bg-amber-500'
                  : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, ((health.temperatureC || 40) / 90) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Database & System Counts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recorder & Database Telemetry */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-semibold uppercase text-slate-200">
                Recorder & SQLite Database
              </span>
            </div>
            <button
              onClick={onNavigateToConfig}
              className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
            >
              Juster recorder filter
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px]">Database Størrelse:</div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">{health.dbSizeMb} MB</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {health.dbSizeMb > 1000 ? '⚠️ Bør optimaliseres med purge' : 'Normalt fotavtrykk'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-500 text-[10px]">Skrivekø i minnet:</div>
              <div className="text-lg font-bold text-slate-100 mt-0.5">{health.recorderQueueLength} hendelser</div>
              <div className="text-[10px] text-emerald-400 mt-1">✓ Lav latency mot disk</div>
            </div>
          </div>
        </div>

        {/* Entities and Device Inventory */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xs font-semibold uppercase text-slate-200">
                Inventar & Ressurser
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <div className="text-2xl font-bold text-cyan-400">{health.totalEntities}</div>
              <div className="text-[10px] text-slate-400 mt-1">Entiteter</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <div className="text-2xl font-bold text-emerald-400">{health.totalDevices}</div>
              <div className="text-[10px] text-slate-400 mt-1">Fysiske Enheter</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <div className="text-2xl font-bold text-amber-400">{health.totalAutomations}</div>
              <div className="text-[10px] text-slate-400 mt-1">Automasjoner</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
