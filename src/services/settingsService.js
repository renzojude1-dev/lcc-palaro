
import { listRecords, saveRecord } from './dataService';

export async function getSettings() {
  const { data, error } = await listRecords('event_settings', {
    limit: 1,
  });

  return {
    data: data?.[0] ?? null,
    error,
  };
}

export async function saveSettings(settings, id) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {
      data: null,
      error: new Error('Please provide valid event settings.'),
    };
  }

  return saveRecord('event_settings', settings, id);
}
