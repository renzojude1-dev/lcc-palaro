
import { useEffect, useState } from 'react';
import { subscribeToTable } from '../services/dataService';

export function useRealtimeTable(table, refresh) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const stop = subscribeToTable(table, () => {
      refresh?.();
    });

    setConnected(true);

    return () => {
      stop?.();
    };
  }, [table, refresh]);

  return { connected };
}
