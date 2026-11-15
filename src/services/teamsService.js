
import {
  listRecords,
  saveRecord,
  deleteRecord,
} from './dataService';

export const getTeams = (options = {}) =>
  listRecords('teams', {
    orderBy: 'name',
    ascending: true,
    ...options,
  });

export const saveTeam = (record, id) =>
  saveRecord('teams', record, id);

export const removeTeam = (id) =>
  deleteRecord('teams', id);
