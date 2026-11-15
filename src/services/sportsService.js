
import {
  listRecords,
  saveRecord,
  deleteRecord,
} from './dataService';

export const getSports = (options = {}) =>
  listRecords('sports', {
    orderBy: 'name',
    ascending: true,
    ...options,
  });

export const saveSport = (record, id) =>
  saveRecord('sports', record, id);

export const removeSport = (id) =>
  deleteRecord('sports', id);
