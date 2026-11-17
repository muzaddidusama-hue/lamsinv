import { supabase } from '../supabaseClient';

/**
 * Subscribe to Postgres changes and debounce refetches caused by a burst of
 * related writes. The returned disposer clears the timer and removes channel.
 */
export function subscribeToDatabaseChanges(channelName, tables, onChange, debounceMs = 350) {
  let timer = null;
  let hasConnected = false;

  const scheduleChange = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, debounceMs);
  };

  let channel = supabase.channel(channelName);
  for (const { table, event = '*', filter } of tables) {
    const config = { event, schema: 'public', table };
    if (filter) config.filter = filter;
    channel = channel.on('postgres_changes', config, scheduleChange);
  }

  channel.subscribe((status) => {
    // A fresh snapshot after reconnect heals updates missed while offline.
    if (status === 'SUBSCRIBED') {
      if (hasConnected) scheduleChange();
      hasConnected = true;
    }
  });

  return () => {
    if (timer) clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}
