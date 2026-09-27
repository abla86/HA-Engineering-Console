import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Copy,
  ShieldCheck,
  CheckCircle,
  EyeOff,
} from 'lucide-react';
import { generateReport } from '../services/api.js';

export const ReportExport: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [anonymize, setAnonymize] = useState<boolean>(true);
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    generateReport(anonymize).then((res) => setReport(res));
  }, [anonymize]);

  const generateMarkdownReport = (data: any): string => {
    if (!data) return '';
    return `# HOME ASSISTANT ENGINEERING DIAGNOSTICS REPORT
Generert: ${data.generatedAt}
Sikkerhetsnivå: SANITIZED (Tokens, passord og personidentifikatorer er maskert)

## 1. Systemoversikt & Helse
- **Plattform:** ${data.system.installationType.toUpperCase()}
- **Home Assistant Versjon:** ${data.system.version}
- **Helse-Score:** ${data.system.score}/100
- **CPU:** ${data.system.cpuPercent}% | **RAM:** ${data.system.memoryPercent}% | **Disk:** ${data.system.diskPercent}%
- **Totalt Antall Entiteter:** ${data.system.totalEntities}

## 2. Diagnostiske Funn
- **Kritiske feil:** ${data.diagnosticsSummary.criticalCount}
- **Advarsler:** ${data.diagnosticsSummary.warningCount}

### Detaljert funnoversikt:
${data.diagnosticsSummary.findings
  .map(
    (f: any, i: number) => `
### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}
- **Evidens:** \`${f.evidence}\`
- **Forklaring:** ${f.explanation}
- **Foreslått Tiltak:** ${f.proposedFix}
`
  )
  .join('\n')}

---
*Rapport produsert lokalt av HA Engineering Console.*
`;
  };

  const handleCopy = () => {
    const text = format === 'markdown' ? generateMarkdownReport(report) : JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = format === 'markdown' ? generateMarkdownReport(report) : JSON.stringify(report, null, 2);
    const blob = new Blob([text], { type: format === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ha-diagnostics-report.${format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            Sanitert Diagnoserapport
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Eksporter komplett helserapport med full evidens, trygt strippet for passord, tokens og koordinater.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Kopiert!' : 'Kopier'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Last ned rapport</span>
          </button>
        </div>
      </div>

      {/* Options Bar */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0f172a] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="anonymize"
            checked={anonymize}
            onChange={(e) => setAnonymize(e.target.checked)}
            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="anonymize" className="text-slate-300 cursor-pointer flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensurér personlige navn og private entitets-IDer</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Format:</span>
          <button
            onClick={() => setFormat('markdown')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              format === 'markdown'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Markdown (.md)
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              format === 'json'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON (.json)
          </button>
        </div>
      </div>

      {/* Preview Box */}
      <div className="rounded-xl border border-slate-800 bg-[#090d15] shadow-2xl p-5 font-mono text-xs overflow-hidden">
        <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2 mb-3">
          <span>Forhåndsvisning av rapport:</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secrets Maskert
          </span>
        </div>

        <pre className="max-h-[480px] overflow-y-auto text-slate-300 leading-relaxed whitespace-pre-wrap">
          {format === 'markdown'
            ? generateMarkdownReport(report)
            : JSON.stringify(report, null, 2)}
        </pre>
      </div>
    </div>
  );
};
