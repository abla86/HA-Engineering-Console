import * as yaml from 'js-yaml';
import * as Diff from 'diff';

export interface YamlValidationError {
  line?: number;
  column?: number;
  message: string;
  field?: string;
}

export interface YamlValidationResult {
  valid: boolean;
  errors: YamlValidationError[];
  parsed?: any;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export class YamlEngine {
  /**
   * Validates YAML syntax and Home Assistant specific schemas
   */
  public static validate(
    rawYaml: string,
    schemaType: 'automation' | 'configuration' | 'script' | 'esphome' | 'mqtt' | 'dashboard' | 'general' = 'general'
  ): YamlValidationResult {
    if (!rawYaml || rawYaml.trim().length === 0) {
      return { valid: true, errors: [], parsed: null };
    }

    // Pre-sanitize Home Assistant specific tags like !include, !secret, etc. so js-yaml can parse without error
    const sanitizedYaml = rawYaml.replace(
      /!(?:include(?:_dir_(?:list|named|merge_list|merge_named))?|secret|env_var)\s+([^\n]+)/g,
      '"!tag $1"'
    );

    let parsed: any;
    try {
      parsed = yaml.load(sanitizedYaml);
    } catch (err: any) {
      const line = err.mark ? err.mark.line + 1 : undefined;
      const column = err.mark ? err.mark.column + 1 : undefined;
      return {
        valid: false,
        errors: [
          {
            line,
            column,
            message: err.reason || err.message || 'Ugyldig YAML syntaks',
          },
        ],
      };
    }

    const errors: YamlValidationError[] = [];

    // 1. ESPHome schema validation
    if (schemaType === 'esphome' && parsed) {
      if (typeof parsed !== 'object') {
        errors.push({ message: 'ESPHome konfigurasjon må være et gyldig mapping-objekt.' });
      } else {
        if (!parsed.esphome) {
          errors.push({
            field: 'esphome',
            message: "ESPHome konfigurasjon mangler obligatorisk 'esphome:' blokk med 'name:'.",
          });
        }
        if (!parsed.esp32 && !parsed.esp8266 && !parsed.rp2040) {
          errors.push({
            field: 'platform',
            message: "Mangler mikrokontroller-plattform (f.eks. 'esp32:', 'esp8266:' eller 'rp2040:').",
          });
        }
        if (!parsed.wifi && !parsed.ethernet) {
          errors.push({
            field: 'network',
            message: "Mangler nettverkstilkobling ('wifi:' eller 'ethernet:').",
          });
        }
      }
    }

    // 2. Automation schema validation
    if (schemaType === 'automation' && parsed) {
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach((item, idx) => {
        if (!item || typeof item !== 'object') {
          errors.push({ message: `Automasjon #${idx + 1} må være et objekt/mapping.` });
          return;
        }

        const prefix = Array.isArray(parsed) ? `Automasjon #${idx + 1}` : 'Automasjon';
        if (!item.trigger && !item.triggers) {
          errors.push({
            field: 'trigger',
            message: `${prefix} mangler obligatorisk 'trigger'-blokk.`,
          });
        }
        if (!item.action && !item.actions) {
          errors.push({
            field: 'action',
            message: `${prefix} mangler obligatorisk 'action'-blokk.`,
          });
        }
        if (item.mode && !['single', 'restart', 'queued', 'parallel'].includes(item.mode)) {
          errors.push({
            field: 'mode',
            message: `Ugyldig execution mode '${item.mode}'. Må være: single, restart, queued eller parallel.`,
          });
        }
      });
    }

    // 3. Script schema validation
    if (schemaType === 'script' && parsed) {
      const scripts = typeof parsed === 'object' ? Object.values(parsed) : [parsed];
      for (const sc of scripts as any[]) {
        if (sc && !sc.sequence) {
          errors.push({
            field: 'sequence',
            message: `Script mangler obligatorisk 'sequence'-liste over handlinger.`,
          });
        }
      }
    }

    // 4. MQTT schema validation
    if (schemaType === 'mqtt' && parsed) {
      if (typeof parsed !== 'object') {
        errors.push({ message: 'MQTT konfigurasjon må være et mapping-objekt.' });
      } else if (!parsed.mqtt && !parsed.sensor && !parsed.switch) {
        errors.push({
          field: 'mqtt',
          message: "MQTT konfigurasjon må inneholde 'mqtt:' rot eller entitetsdefinisjoner.",
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      parsed,
    };
  }

  /**
   * Computes unified line-by-line diff between original and modified YAML
   */
  public static computeDiff(original: string, modified: string): { diffText: string; lines: DiffLine[] } {
    const diff = Diff.structuredPatch('original.yaml', 'modified.yaml', original, modified, '', '');
    const lines: DiffLine[] = [];

    let oldLine = 1;
    let newLine = 1;

    for (const hunk of diff.hunks) {
      for (const l of hunk.lines) {
        if (l.startsWith('+')) {
          lines.push({
            type: 'added',
            content: l.substring(1),
            newLineNumber: newLine++,
          });
        } else if (l.startsWith('-')) {
          lines.push({
            type: 'removed',
            content: l.substring(1),
            oldLineNumber: oldLine++,
          });
        } else {
          lines.push({
            type: 'unchanged',
            content: l.startsWith(' ') ? l.substring(1) : l,
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        }
      }
    }

    const unifiedText = Diff.createPatch('config.yaml', original, modified);
    return { diffText: unifiedText, lines };
  }
}
