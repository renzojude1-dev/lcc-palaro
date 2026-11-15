
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const configurationError = () =>
  new Error(
    'Supabase is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );

const normalizeError = (error) =>
  error instanceof Error ? error : new Error(String(error));

export async function listRecords(
  table,
  {
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    limit = 100,
    filters = {},
  } = {}
) {
  if (!isSupabaseConfigured) {
    return { data: [], error: configurationError() };
  }

  try {
    let query = supabase.from(table).select(select);

    if (orderBy) {
      query = query.order(orderBy, {
        ascending,
        nullsFirst: false,
      });
    }

    if (Number.isFinite(limit) && limit > 0) {
      query = query.limit(limit);
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;

    return {
      data: data ?? [],
      error: error ?? null,
    };
  } catch (error) {
    return {
      data: [],
      error: normalizeError(error),
    };
  }
}

export async function saveRecord(table, record, id) {
  if (!isSupabaseConfigured) {
    return { data: null, error: configurationError() };
  }

  try {
    let query;

    if (id) {
      query = supabase
        .from(table)
        .update({
          ...record,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } else {
      query = supabase.from(table).insert(record);
    }

    const { data, error } = await query.select().single();

    return {
      data: data ?? null,
      error: error ?? null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeError(error),
    };
  }
}

export async function deleteRecord(table, id) {
  if (!isSupabaseConfigured) {
    return { error: configurationError() };
  }

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    return { error: error ?? null };
  } catch (error) {
    return { error: normalizeError(error) };
  }
}

export async function uploadImage(file, folder = 'general') {
  if (!isSupabaseConfigured) {
    return {
      path: null,
      url: null,
      error: configurationError(),
    };
  }

  if (!(file instanceof File)) {
    return {
      path: null,
      url: null,
      error: new Error('Please select a valid image file.'),
    };
  }

  try {
    const safeFolder = String(folder)
      .toLowerCase()
      .replace(/[^a-z0-9/_-]/g, '-')
      .replace(/\/+/g, '/')
      .replace(/^\/+|\/+$/g, '');

    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-');

    const path = `${safeFolder || 'general'}/${crypto.randomUUID()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from('palaro-media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) {
      return { path: null, url: null, error };
    }

    const { data: publicData } = supabase.storage
      .from('palaro-media')
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: publicData.publicUrl,
      error: null,
    };
  } catch (error) {
    return {
      path: null,
      url: null,
      error: normalizeError(error),
    };
  }
}

export function subscribeToTable(table, callback) {
  if (!isSupabaseConfigured) {
    return () => {};
  }

  const channel = supabase
    .channel(`public-${table}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
      },
      callback
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
