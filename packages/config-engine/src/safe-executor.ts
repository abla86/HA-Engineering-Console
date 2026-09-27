import { RollbackRecord, SafeAction } from '../../shared/src/types.js';
import { YamlEngine } from './yaml-validator.js';

export class SafeExecutor {
  private actions: Map<string, SafeAction> = new Map();
  private rollbacks: RollbackRecord[] = [];
  private activeFiles: Map<string, string> = new Map();

  constructor() {
    // Seed sample initial configuration files
    this.activeFiles.set(
      'configuration.yaml',
      `# Initial Home Assistant Configuration
default_config:
frontend:
automation: !include automations.yaml
recorder:
  purge_keep_days: 10
`
    );

    this.activeFiles.set(
      'automations.yaml',
      `- id: '1720000001'
  alias: 'Lys på ved bevegelse gang'
  trigger:
    - platform: state
      entity_id: binary_sensor.hallway_motion
      to: 'on'
  action:
    - service: light.turn_on
      target:
        entity_id: light.hallway_light
  mode: single
`
    );
  }

  public getFileContent(fileName: string): string {
    return this.activeFiles.get(fileName) || '';
  }

  public setFileContent(fileName: string, content: string): void {
    this.activeFiles.set(fileName, content);
  }

  /**
   * Stage an action with full diff and validation
   */
  public proposeAction(params: {
    title: string;
    description: string;
    category: string;
    targetFile: string;
    proposedContent: string;
    riskLevel?: 'low' | 'medium' | 'high';
  }): SafeAction {
    const current = this.getFileContent(params.targetFile);
    const { diffText } = YamlEngine.computeDiff(current, params.proposedContent);
    const validation = YamlEngine.validate(
      params.proposedContent,
      params.targetFile.includes('automation') ? 'automation' : 'configuration'
    );

    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const action: SafeAction = {
      id: actionId,
      title: params.title,
      description: params.description,
      category: params.category,
      targetFile: params.targetFile,
      currentContent: current,
      proposedContent: params.proposedContent,
      diff: diffText,
      riskLevel: params.riskLevel || (validation.valid ? 'low' : 'high'),
      status: 'pending',
      validationResult: {
        valid: validation.valid,
        errors: validation.errors.map((e) => `Linje ${e.line || '?'}: ${e.message}`),
      },
      timestamp: new Date().toISOString(),
    };

    this.actions.set(actionId, action);
    return action;
  }

  /**
   * Safe apply with validation check and automatic backup snapshot
   */
  public applyAction(actionId: string): { success: boolean; message: string; action?: SafeAction } {
    const action = this.actions.get(actionId);
    if (!action) {
      return { success: false, message: 'Handling finnes ikke' };
    }

    if (!action.validationResult.valid) {
      return {
        success: false,
        message: 'Kan ikke utføre handling: Konfigurasjonsvalidering feilet. Rett opp feil før aktivering.',
      };
    }

    // 1. Take backup snapshot of current content
    const backupId = `bkp_${Date.now()}`;
    const rollbackEntry: RollbackRecord = {
      id: `rb_${Date.now()}`,
      actionId: action.id,
      actionTitle: action.title,
      targetFile: action.targetFile,
      restoredContent: action.currentContent,
      timestamp: new Date().toISOString(),
    };

    // 2. Commit modified content
    this.activeFiles.set(action.targetFile, action.proposedContent);

    // 3. Update action state and register rollback
    action.status = 'applied';
    action.backupId = backupId;
    action.appliedAt = new Date().toISOString();
    this.rollbacks.unshift(rollbackEntry);

    return {
      success: true,
      message: `Handling '${action.title}' ble trygt aktivert. Sikkerhetskopi registrert (${backupId}).`,
      action,
    };
  }

  /**
   * Atomic rollback of previous action
   */
  public rollbackAction(rollbackId: string): { success: boolean; message: string } {
    const record = this.rollbacks.find((r) => r.id === rollbackId);
    if (!record) {
      return { success: false, message: 'Rollback-oppføring ble ikke funnet' };
    }

    // Restore content
    this.activeFiles.set(record.targetFile, record.restoredContent);

    // Update corresponding action if exists
    const action = this.actions.get(record.actionId);
    if (action) {
      action.status = 'rolled_back';
    }

    return {
      success: true,
      message: `Tilbakerulling fullført for '${record.actionTitle}'. ${record.targetFile} er tilbakestilt til opprinnelig tilstand.`,
    };
  }

  public getPendingActions(): SafeAction[] {
    return Array.from(this.actions.values()).filter((a) => a.status === 'pending');
  }

  public getAllActions(): SafeAction[] {
    return Array.from(this.actions.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getRollbackHistory(): RollbackRecord[] {
    return this.rollbacks;
  }
}
