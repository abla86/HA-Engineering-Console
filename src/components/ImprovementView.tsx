import React from 'react';
import {
  Sparkles,
  TrendingUp,
  Shield,
  Layers,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { ImprovementItem } from '../../packages/shared/src/types.js';

interface ImprovementViewProps {
  improvements: ImprovementItem[];
  onOpenYamlInStudio: (yaml: string) => void;
}

export const ImprovementView: React.FC<ImprovementViewProps> = ({
  improvements,
  onOpenYamlInStudio,
}) => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          Improvement Engine & Prioriteringer
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Tiltak rangert etter formelen: <span className="text-cyan-400 font-mono">(Effekt × Konfidens × Sikkerhet) ÷ Innsats</span>.
        </p>
      </div>

      <div className="space-y-4">
        {improvements.map((item, idx) => (
          <div
            key={item.id}
            className="p-5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-xl space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 font-mono text-xs flex items-center justify-center font-bold">
                  #{idx + 1}
                </span>
                <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {item.category}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800">
                  Score: {item.score.toFixed(1)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

            {/* Score Factors Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500">Effekt (1-5):</span>{' '}
                <strong className="text-slate-200">{item.impact}</strong>
              </div>
              <div>
                <span className="text-slate-500">Konfidens (1-5):</span>{' '}
                <strong className="text-slate-200">{item.confidence}</strong>
              </div>
              <div>
                <span className="text-slate-500">Sikkerhet (1-5):</span>{' '}
                <strong className="text-emerald-400">{item.safety}</strong>
              </div>
              <div>
                <span className="text-slate-500">Innsats (1-5):</span>{' '}
                <strong className="text-cyan-400">{item.effort}</strong>
              </div>
            </div>

            {/* Evidence & Action */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="text-slate-400">
                Evidens: <span className="text-slate-300">{item.evidence}</span>
              </div>

              {item.proposedYaml && (
                <button
                  onClick={() => onOpenYamlInStudio(item.proposedYaml!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shrink-0 cursor-pointer shadow-md transition-colors"
                >
                  <span>Åpne i Configuration Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
