export const STATUSES = ['unplayed', 'played', 'completed'];
export const STATUS_LABELS = { unplayed: '○ Unplayed', played: '◐ Played', completed: '✓ Completed' };

export function setStatus(progress, id, status) {
  if (!/^[A-Z0-9_]+$/.test(id) || !STATUSES.includes(status)) throw new Error('Invalid progress update.');
  return { ...progress, [id]: status };
}

export function summarize(records, progress) {
  const counts = { unplayed: 0, played: 0, completed: 0, total: records.length };
  for (const record of records) counts[progress[record.id] ?? 'unplayed']++;
  counts.percent = counts.total ? counts.completed / counts.total * 100 : 0;
  return counts;
}
