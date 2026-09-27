import React from 'react';
import {
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
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'doctor'
  | 'entities'
  | 'config'
  | 'esphome'
  | 'actions'
  | 'advisor'
  | 'improvements'
  | 'logs'
  | 'reports'
  | 'connection';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  criticalCount: number;
  warningCount: number;
  pendingActionsCount: number;
  totalEntities: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  criticalCount,
  warningCount,
  pendingActionsCount,
  totalEntities,
}) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = [
    {
      id: 'dashboard',
      label: 'System Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'doctor',
      label: 'System Doctor',
      icon: <Stethoscope className="w-4 h-4" />,
      badge:
        criticalCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            {criticalCount}
          </span>
        ) : warningCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            {warningCount}
          </span>
        ) : null,
    },
    {
      id: 'entities',
      label: 'Enheter & Entiteter',
      icon: <Boxes className="w-4 h-4" />,
      badge: (
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
          {totalEntities}
        </span>
      ),
    },
    {
      id: 'config',
      label: 'Configuration Studio',
      icon: <Code2 className="w-4 h-4" />,
    },
    {
      id: 'esphome',
      label: 'ESPHome Manager',
      icon: <Cpu className="w-4 h-4" />,
      badge: (
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800">
          Firmware
        </span>
      ),
    },
    {
      id: 'actions',
      label: 'Safe Action Center',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge:
        pendingActionsCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
            {pendingActionsCount}
          </span>
        ) : null,
    },
    {
      id: 'advisor',
      label: 'Device Advisor',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'improvements',
      label: 'Improvement Engine',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'logs',
      label: 'Sanntid & Logger',
      icon: <Radio className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Diagnoserapport',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'connection',
      label: 'Connection Center',
      icon: <Network className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#090d15] flex flex-col justify-between shrink-0 select-none">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold">
          Navigasjon & Moduler
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800/90 text-cyan-300 font-semibold border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.12)]'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 font-mono space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span>Sikkerhetsstatus:</span>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Aktiv
          </span>
        </div>
        <div className="text-[10px] text-slate-400">Tokens & nøkler forblir lokalt.</div>
      </div>
    </aside>
  );
};
