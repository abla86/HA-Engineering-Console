/**
 * Security & Privacy Redaction Module
 * Redacts sensitive tokens, credentials, GPS coordinates, public IPs and webhook IDs
 */

export function redactString(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // 1. Redact Bearer / Long-Lived Access Tokens (JWT or hex strings)
  sanitized = sanitized.replace(/(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, '$1[REDACTED_TOKEN]');
  sanitized = sanitized.replace(/(['"]?(?:access_)?token['"]?\s*[:=]\s*['"]?)[A-Za-z0-9-_=]{16,}(['"]?)/gi, '$1[REDACTED_TOKEN]$2');
  sanitized = sanitized.replace(/(['"]?(?:api_)?password['"]?\s*[:=]\s*['"]?)[^\s"',}]+(['"]?)/gi, '$1[REDACTED_PASSWORD]$2');
  sanitized = sanitized.replace(/(['"]?secret['"]?\s*[:=]\s*['"]?)[^\s"',}]+(['"]?)/gi, '$1[REDACTED_SECRET]$2');

  // 2. Redact Webhook IDs (16+ chars)
  sanitized = sanitized.replace(/(['"]?webhook_id['"]?\s*[:=]\s*['"]?)[a-zA-Z0-9_-]{16,}(['"]?)/gi, '$1[REDACTED_WEBHOOK_ID]$2');

  // 3. Redact GPS coordinates (latitude, longitude)
  sanitized = sanitized.replace(/(['"]?latitude['"]?\s*[:=]\s*)-?\d+\.\d+/gi, '$1[REDACTED_LAT]');
  sanitized = sanitized.replace(/(['"]?longitude['"]?\s*[:=]\s*)-?\d+\.\d+/gi, '$1[REDACTED_LON]');
  sanitized = sanitized.replace(/(gps["':\s]+\[)-?\d+\.\d+,\s*-?\d+\.\d+(\])/gi, '$1[REDACTED_GPS]$2');

  // 4. Redact Public IPv4 addresses
  sanitized = sanitized.replace(/\b(?!10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.0\.0\.1)(\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_PUBLIC_IP]');

  return sanitized;
}

export function redactJson<T>(obj: T, anonymizeEntities = false): T {
  if (obj === null || obj === undefined) return obj;

  function deepClean(item: any): any {
    if (item === null || item === undefined) return item;

    if (typeof item === 'string') {
      let str = redactString(item);
      if (anonymizeEntities) {
        str = str.replace(/person\.[a-z0-9_]+/gi, 'person.user_anonymized');
        str = str.replace(/device_tracker\.[a-z0-9_]+/gi, 'device_tracker.device_anonymized');
      }
      return str;
    }

    if (typeof item !== 'object') {
      return item;
    }

    if (Array.isArray(item)) {
      return item.map(deepClean);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(item)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('webhook_id')
      ) {
        result[key] = '[REDACTED_TOKEN]';
      } else if (lowerKey === 'latitude' || lowerKey === 'longitude') {
        result[key] = '[REDACTED_COORD]';
      } else {
        result[key] = deepClean(value);
      }
    }
    return result;
  }

  return deepClean(obj);
}
