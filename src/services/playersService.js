
import { listRecords } from './dataService';

/**
 * Fetch player records from Supabase.
 *
 * Players do not have a direct foreign-key relationship
 * with teams in this database, so we fetch players without
 * joining the teams table.
 *
 * @param {Object} options
 * @param {number} options.limit - Maximum number of records.
 * @param {Object} options.filters - Supabase equality filters.
 * @param {string|null} options.orderBy - Column used for sorting.
 * @param {boolean} options.ascending - Sort direction.
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getPlayers({
  limit = 100,
  filters = {},
  orderBy = 'created_at',
  ascending = false,
} = {}) {
  return listRecords('players', {
    select: '*',
    orderBy,
    ascending,
    limit,
    filters,
  });
}
