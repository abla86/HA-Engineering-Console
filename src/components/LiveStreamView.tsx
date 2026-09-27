import React, { useState, useEffect } from 'react';
import {
  Radio,
  Activity,
  AlertTriangle,
  Info,
  Clock,
  Terminal,
  Zap,
} from 'lucide-react';
import { fetchLogs, fetchRepairs } from '../services/api.js';

export const LiveStreamView: React.FC = () => {
  const [events, setEvents] = useState<Array<any>>([]);
  const [logs, setLogs] = useState<Array<any>>([]);
  const [repairs, setRepairs] = useState<Array<any>>([]);
  const [activeTab, setActiveTab] = useState<'stream' | 'logs' | 'repairs'>('stream');

  useEffect(() => {
    // 1. Connect to SSE live stream
    const eventSource = new EventSource('/api/ha/events/stream');
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => [data, ...prev.slice(0, 49)]); // keep last 50 events
      } catch {
        // Ignore parse error
      }
    };

    // 2. Fetch logs and repairs
    fetchLogs().then((res) => setLogs(res || []));
    fetchRepairs().then((res) => setRepairs(res || []));

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-cyan-400" />
            Sanntidshendelser & Systemlogger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live telemetristrøm via Server-Sent Events (SSE) og Home Assistant systemlogger.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stream'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Event Stream ({events.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-slate-800 text-slate-200 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Systemlogger ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'repairs'
                ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reparasjoner ({repairs.length})
          </button>
        </div>
      </div>

      {activeTab === 'stream' ? (
        <div className="rounded-xl border border-slate-800 bg-[#090d15] shadow-2xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-3">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Sanntids hendelsesstrøm (Siste 50 meldinger)</span>
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Tilkoblet SSE
            </span>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {events.map((ev, i) => (
              <div
                key={i}
                className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 hover:bg-slate-900 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700">
                    {ev.event_type || ev.type}
                  </span>
                  <span className="font-semibold text-slate-200">{ev.entity_id || ev.domain || 'system'}</span>
                  {ev.new_state !== undefined && (
                    <span className="text-slate-400 text-[11px]">
                      → <strong className="text-cyan-300">{ev.new_state} {ev.unit || ''}</strong>
                    </span>
                  )}
                  {ev.service && (
                    <span className="text-slate-400 text-[11px]">
                      service: <strong className="text-amber-300">{ev.domain}.{ev.service}</strong>
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(ev.timestamp).toLocaleTimeString('no-NO')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        <div className="rounded-xl border border-slate-800 bg-[#090d15] shadow-2xl p-4 font-mono text-xs space-y-2">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`p-3 rounded border ${
                log.level === 'ERROR'
                  ? 'bg-rose-950/20 border-rose-800/60 text-rose-300'
                  : log.level === 'WARNING'
                  ? 'bg-amber-950/20 border-amber-800/60 text-amber-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1 opacity-80">
                <span>{log.source}</span>
                <span>{log.timestamp}</span>
              </div>
              <div>{log.message}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 font-mono text-xs">
          {repairs.map((rep) => (
            <div
              key={rep.id}
              className="p-4 rounded-xl border border-amber-800/60 bg-amber-950/20 text-amber-200 space-y-1"
            >
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{rep.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{rep.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
