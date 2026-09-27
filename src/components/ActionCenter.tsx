import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCode,
  FileCheck,
  GitCommit,
  Clock,
  Layers,
} from 'lucide-react';
import { RollbackRecord, SafeAction } from '../../packages/shared/src/types.js';
import { applyAction, rollbackAction } from '../services/api.js';

interface ActionCenterProps {
  pendingActions: SafeAction[];
  rollbackHistory: RollbackRecord[];
  onRefresh: () => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
  pendingActions,
  rollbackHistory,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedAction, setSelectedAction] = useState<SafeAction | null>(
    pendingActions.length > 0 ? pendingActions[0] : null
  );
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const handleApply = async (actionId: string) => {
    setIsApplying(true);
    try {
      const res = await applyAction(actionId);
      if (res.success) {
        alert(res.message);
        setConfirmStep(false);
        onRefresh();
      } else {
        alert(`Kunne ikke utføre handling: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Feil: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRollback = async (rollbackId: string) => {
    if (!confirm('Er du sikker på at du vil rulle tilbake denne handlingen?')) return;
    try {
      const res = await rollbackAction(rollbackId);
      alert(res.message);
      onRefresh();
    } catch (err: any) {
      alert(`Feil ved tilbakerulling: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Safe Action Center & Rollback
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Eksplisitt to-trinns godkjenning for alle skriveoperasjoner, automatisk backup og 1-klikk tilbakerulling.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Venter på godkjenning ({pendingActions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rollback-historikk ({rollbackHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        pendingActions.length === 0 ? (
          <div className="p-12 text-center bg-[#0f172a] border border-slate-800 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">Ingen ventende handlinger</div>
            <div className="text-xs text-slate-400 font-mono">
              Alle konfigurasjonsendringer må først meldes inn fra Configuration Studio eller System Doctor.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Action List */}
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action);
                    setConfirmStep(false);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedAction?.id === action.id
                      ? 'bg-emerald-950/30 border-emerald-500/80 shadow-lg'
                      : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-slate-100">{action.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                        action.riskLevel === 'low'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {action.riskLevel.toUpperCase()} RISIKO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mb-2">{action.description}</p>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Fil: {action.targetFile}</span>
                    <span>{new Date(action.timestamp).toLocaleTimeString('no-NO')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Action Details & Diff */}
            {selectedAction && (
              <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4 font-mono text-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-100">{selectedAction.title}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Målfil: <strong className="text-cyan-400">{selectedAction.targetFile}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                      <FileCheck className="w-4 h-4" />
                      <span>Validert før aktivering</span>
                    </div>
                  </div>

                  {/* Diff Box */}
                  <div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Eksakt Diff (+ Tillegg / - Fjerning):
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 max-h-64 overflow-y-auto text-[11px] text-slate-300 leading-relaxed font-mono">
                      {selectedAction.diff || 'Ingen tekstendring oppdaget.'}
                    </pre>
                  </div>

                  {/* Safety Warning */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      Automatisk sikkerhetskopi tas før aktivering. Handlingen registreres i tilbakerullingshistorikken.
                    </div>
                  </div>
                </div>

                {/* Two-step confirmation footer */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  {!confirmStep ? (
                    <button
                      onClick={() => setConfirmStep(true)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer text-center shadow-lg"
                    >
                      Trinn 1: Godkjenn Plan & Klargjør Aktivering
                    </button>
                  ) : (
                    <div className="w-full flex items-center gap-2">
                      <button
                        onClick={() => setConfirmStep(false)}
                        className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs cursor-pointer hover:bg-slate-800"
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={() => handleApply(selectedAction.id)}
                        disabled={isApplying}
                        className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer text-center shadow-lg animate-pulse"
                      >
                        {isApplying ? 'Skriver trygt med backup...' : 'Trinn 2: EKSPLISITT BEKREFT OG AKTIVER NÅ'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* History & Rollback Table */
        <div className="rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl overflow-hidden font-mono text-xs">
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
            Tidligere Utførte Endringer & Snapshot
          </div>

          <div className="divide-y divide-slate-800/60">
            {rollbackHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Ingen endringer er utført ennå. Rollback-loggen er tom.
              </div>
            ) : (
              rollbackHistory.map((rb) => (
                <div key={rb.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-900/50">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-200">{rb.actionTitle}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Fil: {rb.targetFile}</span>
                      <span>•</span>
                      <span>Utført: {new Date(rb.timestamp).toLocaleString('no-NO')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRollback(rb.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800 hover:bg-rose-900 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rull tilbake nå</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
