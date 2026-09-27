import React, { useState, useEffect } from 'react';
import {
  Network,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Server,
  Zap,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CapabilityMatrix, InstallationType } from '../../packages/shared/src/types.js';
import { testConnection, setMockProfile } from '../services/api.js';

interface ConnectionCenterProps {
  onConnectionSuccess: () => void;
  activeProfile: string;
  isMock: boolean;
}

export const ConnectionCenter: React.FC<ConnectionCenterProps> = ({
  onConnectionSuccess,
  activeProfile,
  isMock,
}) => {
  const [mode, setMode] = useState<'mock' | 'live'>(isMock ? 'mock' : 'live');
  const [selectedMockProfile, setSelectedMockProfile] = useState<string>(activeProfile);
  const [liveUrl, setLiveUrl] = useState<string>('http://homeassistant.local:8123');
  const [token, setToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [rememberCredentials, setRememberCredentials] = useState<boolean>(true);

  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    version?: string;
    installationType?: InstallationType;
    tlsSecure?: boolean;
    responseTimeMs?: number;
    capabilities?: CapabilityMatrix;
  } | null>(null);

  useEffect(() => {
    // Load persisted connection settings from obfuscated localStorage if available
    try {
      const saved = localStorage.getItem('ha_console_conn');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url) setLiveUrl(parsed.url);
        if (parsed.token) setToken(atob(parsed.token));
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.mockProfile) setSelectedMockProfile(parsed.mockProfile);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const payload = {
        isMock: mode === 'mock',
        mockProfile: selectedMockProfile,
        url: liveUrl,
        token: token,
      };

      const res = await testConnection(payload);
      setTestResult(res);

      if (res.success) {
        if (mode === 'mock') {
          await setMockProfile(selectedMockProfile);
        }

        if (rememberCredentials) {
          try {
            localStorage.setItem(
              'ha_console_conn',
              JSON.stringify({
                url: liveUrl,
                token: token ? btoa(token) : '',
                mode,
                mockProfile: selectedMockProfile,
              })
            );
          } catch {
            // Ignore storage failure
          }
        }

        onConnectionSuccess();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Ukjent feil under tilkoblingstesting.',
      });
    } finally {
      setTesting(false);
    }
  };

  const mockProfiles = [
    {
      id: 'green',
      name: 'Home Assistant Green',
      desc: 'Offisiell maskinvare med Home Assistant OS 12.3, SkyConnect Zigbee og Supervisor.',
      type: 'ha_os',
      badge: 'HA OS',
    },
    {
      id: 'casaos',
      name: 'CasaOS / Docker Container',
      desc: 'Containerinstallasjon på CasaOS uten Supervisor. Direkte volumtilgang for YAML.',
      type: 'casaos',
      badge: 'Container',
    },
    {
      id: 'rpi_core',
      name: 'Raspberry Pi 4 Core',
      desc: 'Kjører HA Core direkte i Python på RPi OS. Høyt CPU/termisk press og SD-lagring.',
      type: 'core',
      badge: 'Core',
    },
    {
      id: 'yellow_matter',
      name: 'Home Assistant Yellow (Matter/Thread)',
      desc: 'CM4 med integrert Zigbee/Matter-radio, NVMe SSD og 80+ smarte enheter.',
      type: 'yellow',
      badge: 'HA Yellow',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2.5">
            <Network className="w-5 h-5 text-cyan-400" />
            Connection Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurer sikker tilkobling til Home Assistant med automatisk kapabilitetsdeteksjon.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setMode('mock')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
              mode === 'mock'
                ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-700/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 Virtuell Test Lab (Mock)
          </button>
          <button
            onClick={() => setMode('live')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
              mode === 'live'
                ? 'bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Ekte Home Assistant
          </button>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
        {mode === 'mock' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
                Velg Simulert Miljøprofil
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">
                Realistiske feilscenarioer & telemetri
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mockProfiles.map((p) => {
                const isSelected = selectedMockProfile === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedMockProfile(p.id)}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-100">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 font-semibold mb-1">
                Home Assistant URL eller lokal IP
              </label>
              <input
                type="text"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="http://homeassistant.local:8123 eller https://ha.example.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standardport er 8123. Hvis du bruker Nabu Casa eller eksternt domene, oppgi full HTTPS-adresse.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-slate-300 font-semibold">
                  Long-Lived Access Token
                </label>
                <a
                  href="https://www.home-assistant.io/docs/authentication/#your-account-profile"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                >
                  Hvordan opprette token? <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberCredentials}
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer select-none">
                Husk tilkoblingsdetaljer lokalt i denne nettleseren (lagres obfuskert i localStorage)
              </label>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sikkerhetsnivå er automatisk satt til READ_ONLY ved oppstart.</span>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-semibold transition-all cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Tester forbindelse...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Test & Aktiver Tilkobling</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Result & Diagnostics Banner */}
      {testResult && (
        <div
          className={`p-5 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            testResult.success
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <div className="font-semibold text-sm">
                {testResult.success ? 'Tilkobling Vellykket' : 'Tilkobling Feilet'}
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {testResult.message}
              </p>

              {testResult.success && testResult.capabilities && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {testResult.tlsSecure ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>HTTPS (Sikker TLS)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-amber-400" />
                          <span>HTTP (Lokal / Usikret)</span>
                        </>
                      )}
                    </span>

                    <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Responstid: <strong className="text-cyan-400">{testResult.responseTimeMs}ms</strong>
                    </span>

                    <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      Plattform: <strong className="text-cyan-400">{testResult.installationType?.toUpperCase()}</strong>
                    </span>
                  </div>

                  {/* Capability Matrix */}
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 font-semibold">
                      Oppdaget Kapabilitetsmatrise:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {Object.entries(testResult.capabilities).map(([key, enabled]) => (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-mono border ${
                            enabled
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                              : 'bg-slate-900/80 border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          <span>{enabled ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
