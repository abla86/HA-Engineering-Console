import React from 'react';
import {
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Lock,
  Unlock,
  Terminal,
  RefreshCw,
  Search,
} from 'lucide-react';
import { SecurityMode, SystemHealth } from '../../packages/shared/src/types.js';

interface HeaderProps {
  systemHealth: SystemHealth | null;
  securityMode: SecurityMode;
  onSecurityModeChange: (mode: SecurityMode) => void;
  onOpenCommandPalette: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeProfile: string;
  isMock: boolean;
  onOpenConnectionCenter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemHealth,
  securityMode,
  onSecurityModeChange,
  onOpenCommandPalette,
  onRefresh,
  isRefreshing,
  activeProfile,
  isMock,
  onOpenConnectionCenter,
}) => {
  const getSecurityBadge = () => {
    switch (securityMode) {
      case 'READ_ONLY':
        return {
          label: 'READ_ONLY',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />,
          classes: 'bg-cyan-950/70 border-cyan-800/80 text-cyan-300',
        };
      case 'PROPOSE':
        return {
          label: 'PROPOSE',
          icon: <Shield className="w-3.5 h-3.5 text-amber-400" />,
          classes: 'bg-amber-950/70 border-amber-800/80 text-amber-300',
        };
      case 'APPLY_SAFE':
        return {
          label: 'APPLY_SAFE',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />,
          classes: 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300',
        };
      case 'ADVANCED':
        return {
          label: 'ADVANCED',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
          classes: 'bg-rose-950/70 border-rose-800/80 text-rose-300',
        };
    }
  };

  const badge = getSecurityBadge();

  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#0d131f]/90 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Instance Tag */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono tracking-wider font-semibold text-sm text-slate-100">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)] animate-pulse" />
          <span>HA ENGINEERING CONSOLE</span>
        </div>

        <button
          onClick={onOpenConnectionCenter}
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 hover:border-slate-500 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          title="Klikk for å endre tilkobling eller lab-profil"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-slate-400">MILJØ:</span>
          <span className="font-semibold text-slate-200">
            {isMock ? `LAB [${activeProfile.toUpperCase()}]` : 'LIVE HA'}
          </span>
          <span className="text-[10px] text-cyan-400 px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40">
            {systemHealth?.version ? `v${systemHealth.version}` : 'Tilkoblet'}
          </span>
        </button>
      </div>

      {/* Middle: Command Palette trigger */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span>Hurtigkommandoer...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Security Mode, Refresh & Telemetry */}
      <div className="flex items-center gap-2.5">
        {/* Security mode selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
          <span className="text-[10px] uppercase font-mono text-slate-400 px-1.5">Sikkerhet:</span>
          {(['READ_ONLY', 'PROPOSE', 'APPLY_SAFE'] as SecurityMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onSecurityModeChange(mode)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-all cursor-pointer ${
                securityMode === mode
                  ? mode === 'READ_ONLY'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : mode === 'PROPOSE'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Latency & Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Oppdater data fra Home Assistant"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};
