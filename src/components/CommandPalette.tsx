import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  Stethoscope,
  Boxes,
  Code2,
  ShieldCheck,
  Cpu,
  Sparkles,
  Radio,
  FileText,
  Network,
  X,
} from 'lucide-react';
import { ActiveTab } from './Sidebar.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onRefresh: () => void;
  onSwitchSafetyMode: (mode: 'READ_ONLY' | 'PROPOSE' | 'APPLY_SAFE') => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onRefresh,
  onSwitchSafetyMode,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'tab_dashboard', label: 'Gå til: System Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, run: () => onSelectTab('dashboard') },
    { id: 'tab_doctor', label: 'Gå til: System Doctor (Diagnostikk & feilsøking)', icon: <Stethoscope className="w-4 h-4" />, run: () => onSelectTab('doctor') },
    { id: 'tab_entities', label: 'Gå til: Enheter & Entiteter Explorer', icon: <Boxes className="w-4 h-4" />, run: () => onSelectTab('entities') },
    { id: 'tab_config', label: 'Gå til: Configuration Studio (YAML Editor & Generator)', icon: <Code2 className="w-4 h-4" />, run: () => onSelectTab('config') },
    { id: 'tab_esphome', label: 'Gå til: ESPHome Manager (Firmware, Noder & BLE Proxy)', icon: <Cpu className="w-4 h-4" />, run: () => onSelectTab('esphome') },
    { id: 'tab_actions', label: 'Gå til: Safe Action Center & Rollback', icon: <ShieldCheck className="w-4 h-4" />, run: () => onSelectTab('actions') },
    { id: 'tab_advisor', label: 'Gå til: Device Advisor (Maskinvareanbefalinger)', icon: <Cpu className="w-4 h-4" />, run: () => onSelectTab('advisor') },
    { id: 'tab_improvements', label: 'Gå til: Improvement Engine (Prioriterte forbedringer)', icon: <Sparkles className="w-4 h-4" />, run: () => onSelectTab('improvements') },
    { id: 'tab_logs', label: 'Gå til: Sanntids Event Stream & Logger', icon: <Radio className="w-4 h-4" />, run: () => onSelectTab('logs') },
    { id: 'tab_reports', label: 'Gå til: Eksporter Diagnoserapport', icon: <FileText className="w-4 h-4" />, run: () => onSelectTab('reports') },
    { id: 'tab_conn', label: 'Gå til: Connection Center', icon: <Network className="w-4 h-4" />, run: () => onSelectTab('connection') },
    { id: 'act_refresh', label: 'Handling: Oppdater systemdata fra Home Assistant', icon: <Search className="w-4 h-4 text-cyan-400" />, run: () => onRefresh() },
    { id: 'mode_read', label: 'Sikkerhetsmodus: Sett til READ_ONLY', icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />, run: () => onSwitchSafetyMode('READ_ONLY') },
    { id: 'mode_propose', label: 'Sikkerhetsmodus: Sett til PROPOSE', icon: <ShieldCheck className="w-4 h-4 text-amber-400" />, run: () => onSwitchSafetyMode('PROPOSE') },
    { id: 'mode_apply', label: 'Sikkerhetsmodus: Sett til APPLY_SAFE', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, run: () => onSwitchSafetyMode('APPLY_SAFE') },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="p-3 border-b border-slate-800 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Søk etter kommando eller visning..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">
              Ingen kommandoer matchet "{query}"
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.run();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <span className="text-slate-400">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Tast ESC for å lukke</span>
          <span>Bruk piltaster og Enter for å velge</span>
        </div>
      </div>
    </div>
  );
};
