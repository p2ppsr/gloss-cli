import { GlobalKVStore, WalletClient } from "@bsv/sdk";
import { loadConfig } from "./config.js";

export type LogEntry = {
  key: string;          // e.g., "2025-10-06"
  at: string;           // ISO timestamp
  text: string;
  tags?: string[];
  assets?: string[];    // UHRP URLs  
  controller?: string;  // Identity key of who created this log (for future filtering)
};

export type DayChain = {
  key: string;          // Date key (e.g., "2025-10-06")
  logs: LogEntry[];     // All log entries for this day, chronologically ordered
};

/**
 * Standard Gloss Logs Protocol Configuration
 * This creates a globally discoverable protocol for developer logs
 */
const GLOSS_PROTOCOL_ID: [1, 'gloss logs'] = [1, 'gloss logs'];

function makeKV() {
  const cfg = loadConfig();
  const wallet = new WalletClient(cfg.walletMode, `http://localhost`);

  const kv = new GlobalKVStore({
    wallet,
    protocolID: GLOSS_PROTOCOL_ID,
    serviceName: 'ls_kvstore',
    topics: ['tm_kvstore'],
    networkPreset: cfg.networkPreset,
    tokenSetDescription: 'Gloss developer log entry',
    tokenUpdateDescription: 'Updated gloss log entry',
    tokenRemovalDescription: 'Removed gloss log entry'
  });

  return kv;
}

export async function nextIdForDay(yyyyMmDd: string): Promise<string> {
  // Use the date as the key - all logs for a day will be chained
  return yyyyMmDd;
}

export async function putEntry(entry: LogEntry): Promise<void> {
  const kv = makeKV();
  const dayKey = `entry/${entry.key}`;

  // Get existing day chain (if any)
  const existing = await kv.get({ key: dayKey, controller: 'self' });
  const existingRaw = Array.isArray(existing) ? existing[0]?.value : existing?.value;

  let dayChain: DayChain;
  if (existingRaw) {
    // Parse existing chain and add new log
    dayChain = JSON.parse(existingRaw) as DayChain;
    dayChain.logs.push(entry);
  } else {
    // Create new chain with first log
    dayChain = {
      key: entry.key,
      logs: [entry]
    };
  }

  // Store the updated chain (this creates a spend chain)
  await kv.set(dayKey, JSON.stringify(dayChain));
}

export async function getEntry(key: string): Promise<LogEntry | undefined> {
  const kv = makeKV();
  // Query globally - remove controller to see entries from all users
  const result = await kv.get({ key: `entry/${key}` });
  const raw = Array.isArray(result) ? result[0]?.value : result?.value;
  return raw ? JSON.parse(raw) as LogEntry : undefined;
}

export async function listDay(yyyyMmDd: string): Promise<LogEntry[]> {
  const kv = makeKV();

  // Query the day key with history to get the full spend chain
  const result = await kv.get({ key: `entry/${yyyyMmDd}` }, { history: true });

  const allEntries: LogEntry[] = [];

  if (Array.isArray(result)) {
    // Multiple day chains found (from different controllers)
    for (const dayEntry of result) {
      // Process current value
      if (dayEntry.value) {
        try {
          const dayChain = JSON.parse(dayEntry.value) as DayChain;
          dayChain.logs.forEach(log => {
            if (dayEntry.controller) {
              log.controller = dayEntry.controller;
            }
            allEntries.push(log);
          });
        } catch (e) {
          console.warn(`Failed to parse current day chain: ${dayEntry.key}`, e);
        }
      }

      // Process historical values
      if (dayEntry.history && Array.isArray(dayEntry.history)) {
        for (const historicalValue of dayEntry.history) {
          try {
            const historicalChain = JSON.parse(historicalValue) as DayChain;
            historicalChain.logs.forEach(log => {
              if (dayEntry.controller) {
                log.controller = dayEntry.controller;
              }
              allEntries.push(log);
            });
          } catch (e) {
            console.warn(`Failed to parse historical day chain for ${dayEntry.key}`, e);
          }
        }
      }
    }
  } else if (result?.value) {
    // Single day chain found - process current value
    try {
      const dayChain = JSON.parse(result.value) as DayChain;
      dayChain.logs.forEach(log => {
        if (result.controller) {
          log.controller = result.controller;
        }
        allEntries.push(log);
      });
    } catch (e) {
      console.warn(`Failed to parse current day chain: ${result.key}`, e);
    }

    // Process historical values for single result
    if (result.history && Array.isArray(result.history)) {
      for (const historicalValue of result.history) {
        try {
          const historicalChain = JSON.parse(historicalValue) as DayChain;
          historicalChain.logs.forEach(log => {
            if (result.controller) {
              log.controller = result.controller;
            }
            allEntries.push(log);
          });
        } catch (e) {
          console.warn(`Failed to parse historical day chain for ${result.key}`, e);
        }
      }
    }
  }

  // Remove duplicates based on timestamp and text (in case of overlaps)
  const uniqueEntries = allEntries.filter((entry, index, arr) =>
    arr.findIndex(e => e.at === entry.at && e.text === entry.text) === index
  );

  // Sort by timestamp for chronological order
  uniqueEntries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return uniqueEntries;
}
