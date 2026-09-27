import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Sidebar, ActiveTab } from './components/Sidebar.js';
import { CommandPalette } from './components/CommandPalette.js';
import { ConnectionCenter } from './components/ConnectionCenter.js';
import { SystemDashboard } from './components/SystemDashboard.js';
import { DiagnosticsDoctor } from './components/DiagnosticsDoctor.js';
import { EntityExplorer } from './components/EntityExplorer.js';
import { ConfigStudio } from './components/ConfigStudio.js';
import { ESPHomeManager } from './components/ESPHomeManager.js';
import { ActionCenter } from './components/ActionCenter.js';
import { DeviceAdvisorView } from './components/DeviceAdvisorView.js';
import { ImprovementView } from './components/ImprovementView.js';
import { LiveStreamView } from './components/LiveStreamView.js';
import { ReportExport } from './components/ReportExport.js';
import {
  AdvisorRecommendation,
  Finding,
  HAArea,
  HADevice,
  HAState,
  ImprovementItem,
  RollbackRecord,
  SafeAction,
  SecurityMode,
  SystemHealth,
} from '../packages/shared/src/types.js';
import {
  fetchActions,
  fetchAreas,
  fetchDeviceAdvisor,
  fetchDevices,
  fetchRecommendations,
  fetchStates,
  fetchSystemStatus,
  runDiagnostics,
  proposeAction,
} from './services/api.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [securityMode, setSecurityMode] = useState<SecurityMode>('READ_ONLY');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active Connection Info
  const [activeProfile, setActiveProfile] = useState<string>('green');
  const [isMock, setIsMock] = useState<boolean>(true);

  // Core Data
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [states, setStates] = useState<HAState[]>([]);
  const [devices, setDevices] = useState<HADevice[]>([]);
  const [areas, setAreas] = useState<HAArea[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [recommendations, setRecommendations] = useState<ImprovementItem[]>([]);
  const [deviceAdvice, setDeviceAdvice] = useState<AdvisorRecommendation[]>([]);
  const [pendingActions, setPendingActions] = useState<SafeAction[]>([]);
  const [rollbackHistory, setRollbackHistory] = useState<RollbackRecord[]>([]);

  // Config Studio Staging State
  const [stagedYaml, setStagedYaml] = useState<string | undefined>(undefined);
  const [stagedFileName, setStagedFileName] = useState<string | undefined>(undefined);

  const loadAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        healthRes,
        statesRes,
        devicesRes,
        areasRes,
        diagRes,
        recsRes,
        adviceRes,
        actionsRes,
      ] = await Promise.all([
        fetchSystemStatus(),
        fetchStates(),
        fetchDevices(),
        fetchAreas(),
        runDiagnostics(),
        fetchRecommendations(),
        fetchDeviceAdvisor(),
        fetchActions(),
      ]);

      setHealth(healthRes);
      setStates(statesRes);
      setDevices(devicesRes);
      setAreas(areasRes);
      setFindings(diagRes.findings || []);
      setRecommendations(recsRes || []);
      setDeviceAdvice(adviceRes || []);
      setPendingActions(actionsRes.pending || []);
      setRollbackHistory(actionsRes.rollbacks || []);
      setActiveProfile(healthRes.installationType);
    } catch (err: any) {
      console.error('Feil ved lasting av data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Stage fix from diagnostics
  const handleStageFindingFix = (finding: Finding) => {
    if (finding.suggestedPatchYaml) {
      setStagedYaml(finding.suggestedPatchYaml);
      setStagedFileName(finding.affectedFile || 'automations.yaml');
      setActiveTab('config');
    }
  };

  const handleOpenYamlInStudio = (yaml: string) => {
    setStagedYaml(yaml);
    setActiveTab('config');
  };

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Engineering Control Bar */}
      <Header
        systemHealth={health}
        securityMode={securityMode}
        onSecurityModeChange={setSecurityMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onRefresh={loadAllData}
        isRefreshing={isRefreshing}
        activeProfile={activeProfile}
        isMock={isMock}
        onOpenConnectionCenter={() => setActiveTab('connection')}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          criticalCount={criticalCount}
          warningCount={warningCount}
          pendingActionsCount={pendingActions.length}
          totalEntities={states.length}
        />

        {/* Dynamic Center Stage */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f17]">
          {activeTab === 'dashboard' && (
            <SystemDashboard
              health={health}
              onNavigateToDoctor={() => setActiveTab('doctor')}
              onNavigateToActionCenter={() => setActiveTab('actions')}
              onNavigateToConfig={() => setActiveTab('config')}
            />
          )}

          {activeTab === 'doctor' && (
            <DiagnosticsDoctor
              findings={findings}
              onStageFix={handleStageFindingFix}
            />
          )}

          {activeTab === 'entities' && (
            <EntityExplorer
              states={states}
              devices={devices}
              areas={areas}
            />
          )}

          {activeTab === 'config' && (
            <ConfigStudio
              initialYaml={stagedYaml}
              initialFileName={stagedFileName}
              defaultStudioMode="yaml"
              onActionStaged={() => {
                loadAllData();
                setActiveTab('actions');
              }}
            />
          )}

          {activeTab === 'esphome' && (
            <div className="p-6 max-w-6xl mx-auto">
              <ESPHomeManager
                onOpenInConfigStudio={(yaml, fName) => {
                  setStagedYaml(yaml);
                  setStagedFileName(fName);
                  setActiveTab('config');
                }}
                onStageToSafeActionCenter={(title, fName, yaml) => {
                  proposeAction({
                    title,
                    description: `ESPHome firmware oppdatering for ${fName}`,
                    category: 'esphome',
                    targetFile: fName,
                    proposedContent: yaml,
                    riskLevel: 'low',
                  }).then(() => {
                    loadAllData();
                    setActiveTab('actions');
                  });
                }}
              />
            </div>
          )}

          {activeTab === 'actions' && (
            <ActionCenter
              pendingActions={pendingActions}
              rollbackHistory={rollbackHistory}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'advisor' && (
            <DeviceAdvisorView
              recommendations={deviceAdvice}
            />
          )}

          {activeTab === 'improvements' && (
            <ImprovementView
              improvements={recommendations}
              onOpenYamlInStudio={handleOpenYamlInStudio}
            />
          )}

          {activeTab === 'logs' && <LiveStreamView />}

          {activeTab === 'reports' && <ReportExport />}

          {activeTab === 'connection' && (
            <ConnectionCenter
              onConnectionSuccess={loadAllData}
              activeProfile={activeProfile}
              isMock={isMock}
            />
          )}
        </main>
      </div>

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setActiveTab}
        onRefresh={loadAllData}
        onSwitchSafetyMode={setSecurityMode}
      />
    </div>
  );
}
