import React from 'react';
import {
  Cpu,
  AlertCircle,
  Radio,
  Lock,
  Battery,
  MapPin,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { AdvisorRecommendation } from '../../packages/shared/src/types.js';

interface DeviceAdvisorViewProps {
  recommendations: AdvisorRecommendation[];
}

export const DeviceAdvisorView: React.FC<DeviceAdvisorViewProps> = ({ recommendations }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Device Advisor & Maskinvarebehov
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Anbefalinger om maskinvare og sensorer basert utelukkende på dokumenterte mangler i din installasjon.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="p-12 text-center bg-[#0f172a] border border-slate-800 rounded-xl space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-200">Ingen uoppfylte maskinvarebehov oppdaget</div>
          <div className="text-xs text-slate-400 font-mono">
            Eksisterende sensorer dekker sikkerhet, klima og radiomesh tilfredsstillende.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-4"
            >
              {/* Problem Statement */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{item.problem}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 border border-rose-800 text-rose-300 font-semibold self-start sm:self-auto">
                  {item.priority.toUpperCase()} PRIORITET
                </span>
              </div>

              {/* Proposed Hardware Category & Protocol */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-slate-500 text-[10px]">Foreslått Enhetskategori:</div>
                  <div className="font-semibold text-slate-100">{item.proposedCategory}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{item.suggestedHardware}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-slate-500 text-[10px]">Protokoll & Lokal Kontroll:</div>
                  <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>{item.requiredProtocol.toUpperCase()} • {item.localControl}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Koordinator: {item.coordinatorRequirement || 'Ingen'}</div>
                </div>
              </div>

              {/* Placement & Limitations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-slate-400">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300">Anbefalt plassering:</strong> {item.recommendedPlacement}
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300">Begrensninger:</strong> {item.limitations}
                  </div>
                </div>
              </div>

              {/* Privacy Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Lock className="w-3 h-3" /> {item.privacyImpact}
                </span>
                <span>Strøm: {item.powerType}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
