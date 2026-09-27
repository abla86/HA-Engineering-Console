import React, { useState } from 'react';
import {
  Stethoscope,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  Info,
  CheckCircle2,
  ArrowRight,
  Shield,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { Finding, FindingSeverity } from '../../packages/shared/src/types.js';

interface DiagnosticsDoctorProps {
  findings: Finding[];
  onStageFix: (finding: Finding) => void;
}

export const DiagnosticsDoctor: React.FC<DiagnosticsDoctorProps> = ({
  findings,
  onStageFix,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getSeverityBadge = (sev: FindingSeverity) => {
    switch (sev) {
      case 'critical':
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
          label: 'Kritisk',
          badgeClass: 'bg-rose-950/80 border-rose-700/80 text-rose-300',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          label: 'Advarsel',
          badgeClass: 'bg-amber-950/80 border-amber-700/80 text-amber-300',
        };
      case 'improvement':
        return {
          icon: <Lightbulb className="w-4 h-4 text-cyan-400" />,
          label: 'Forbedring',
          badgeClass: 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300',
        };
      case 'information':
      default:
        return {
          icon: <Info className="w-4 h-4 text-slate-400" />,
          label: 'Informasjon',
          badgeClass: 'bg-slate-900 border-slate-700 text-slate-400',
        };
    }
  };

  const filtered = findings.filter((f) => {
    const matchesSev = selectedSeverity === 'all' || f.severity === selectedSeverity;
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSev && matchesCat;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header and Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Stethoscope className="w-5 h-5 text-cyan-400" />
            System Doctor & Diagnostikk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evidensbasert analyse av system, integrasjoner, entiteter, automasjoner og recorder.
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'critical', 'warning', 'improvement'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                selectedSeverity === sev
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sev === 'all' ? `Alle (${findings.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#0f172a] border border-slate-800 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">Ingen funn i valgt kategori!</div>
            <div className="text-xs text-slate-400 font-mono">
              Alle analyserte komponenter opererer innenfor normale parametere.
            </div>
          </div>
        ) : (
          filtered.map((item) => {
            const sevBadge = getSeverityBadge(item.severity);
            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4 transition-all hover:border-slate-700"
              >
                {/* Card Title & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    {sevBadge.icon}
                    <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className={`px-2 py-0.5 rounded border uppercase font-semibold ${sevBadge.badgeClass}`}>
                      {sevBadge.label}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      Konfidens: <strong className="text-slate-200">{item.confidence}%</strong>
                    </span>
                  </div>
                </div>

                {/* Evidence Box */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-xs space-y-1">
                  <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" /> Konkret Evidens
                  </div>
                  <div className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800 text-[11px] break-all">
                    {item.evidence}
                  </div>
                </div>

                {/* Explanation and Root Cause */}
                <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                  <div className="font-semibold text-slate-400 uppercase text-[10px] font-mono">
                    Årsak & Forklaring:
                  </div>
                  <p>{item.explanation}</p>
                </div>

                {/* Proposed Fix & Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-emerald-400 uppercase text-[10px] font-mono">
                      Foreslått Tiltak:
                    </div>
                    <div className="text-slate-300 font-mono text-[11px]">{item.proposedFix}</div>
                  </div>

                  {item.suggestedPatchYaml && (
                    <button
                      onClick={() => onStageFix(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shrink-0 cursor-pointer shadow-md transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Foreslå Sikker Patch</span>
                    </button>
                  )}
                </div>

                {/* Verification Method & Risk Info */}
                <div className="pt-2 border-t border-slate-800/40 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
                  <div>
                    Verifikasjon: <span className="text-slate-300">{item.verificationMethod}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Risiko: <strong className="text-slate-200">{item.risk.toUpperCase()}</strong></span>
                    <span>•</span>
                    <span>Reversibel: <strong className="text-emerald-400">{item.reversible ? 'Ja' : 'Nei'}</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
