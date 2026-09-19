import { STATUSES } from './tracker.js';
export const STORAGE_KEY = 'kaiserreich-run-picker.progress';
export const MAX_SAVE_BYTES = 1_000_000;

export function parseSave(text) {
  if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES) throw new Error('Save is too large.');
  const data = JSON.parse(text);
  if (!data || Array.isArray(data) || (data.schemaVersion ?? data.version) !== 1 ||
      (data.schemaVersion !== undefined && data.schemaVersion !== 1) ||
      (data.version !== undefined && data.version !== 1) ||
      !data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress)) {
    throw new Error('This does not appear to be a valid Kaiserreich Run Picker save file.');
  }
  const progress = {};
  for (const [id, status] of Object.entries(data.progress)) {
    if (!/^[A-Z0-9_]+$/.test(id) || !STATUSES.includes(status)) throw new Error('Invalid path ID or status in save.');
    progress[id] = status;
  }
  return progress;
}

export function exportSave(progress, now = new Date()) {
  return JSON.stringify({ schemaVersion: 1, exportedAt: now.toISOString(), progress }, null, 2);
}

// A provider function catches browsers that throw even when accessing localStorage.
export function createStorage(provider = () => globalThis.localStorage) {
  return {
    load() {
      let raw;
      try {
        raw = provider().getItem(STORAGE_KEY);
      } catch (error) {
        return { progress: {}, error, corrupt: false };
      }
      try { return { progress: raw === null ? {} : parseSave(raw), error: null, corrupt: false }; }
      catch (error) { return { progress: {}, error, corrupt: true }; }
    },
    save(progress) {
      try {
        provider().setItem(STORAGE_KEY, exportSave(progress));
        return true;
      } catch { return false; }
    },
    reset() {
      try { provider().removeItem(STORAGE_KEY); return true; }
      catch { return false; }
    }
  };
}
