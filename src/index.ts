#!/usr/bin/env node
import { Command } from "commander";
import { GlossClient } from "gloss-client";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { loadConfig } from "./config.js";
import crypto from 'crypto'
(global as any).self = { crypto }

const program = new Command();
program.name("gloss").description("build. log. ship.").version("0.1.0");

// Initialize gloss client with config
const config = loadConfig();
const gloss = new GlossClient({
  networkPreset: config.networkPreset,
  walletMode: 'local'
});

program
  .command("log")
  .description("log a message to GlobalKVStore (discoverable via gloss logs protocol)")
  .argument("<message...>", "what changed?")
  .option("-t, --tags <csv>", "tags like auth,infra")
  .action(async (message, opts) => {
    const text = String(message.join(" "));
    const tags = (opts.tags ? String(opts.tags).split(",") : []).map((s: string) => s.trim()).filter(Boolean);

    // Show loading indicator
    process.stdout.write("📝 Logging to blockchain... ");

    try {
      const entry = await gloss.log(text, { tags });

      // Clear loading line and show success
      process.stdout.write("\r");
      console.log(`Logged ✓  Key: ${entry.key}`);
      console.log(`Message: ${text}`);
      if (tags.length) {
        console.log(`Tags: [${tags.join(",")}]`);
      }
    } catch (error) {
      // Clear loading line and show error
      process.stdout.write("\r");
      console.error(`❌ Failed to log: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("snap")
  .description("upload an image/file to UHRP and log to GlobalKVStore (discoverable via gloss logs protocol)")
  .argument("<path>", "local file")
  .option("-c, --caption <text>", "caption/alt text", "")
  .action(async (path: string, opts) => {
    const buf = await readFile(path);
    const mime = String(mimeLookup(path) || "application/octet-stream");
    const caption = String(opts.caption ?? "");

    // Upload and log in one operation
    process.stdout.write("📤 Uploading to UHRP... ");

    try {
      const text = `asset ${basename(path)}${caption ? ` (${caption})` : ""}`;
      const entry = await gloss.logWithAsset(text, new Uint8Array(buf), mime, {
        tags: ["asset"],
        retentionMinutes: config.retentionMinutes,
        storageURL: config.uhrpURL
      });

      // Clear loading line and show success
      process.stdout.write("\r");
      console.log(`Uploaded ✓  ${entry.assets?.[0]}`);
      console.log(`Logged ✓   Key: ${entry.key}`);
      console.log(`Caption: ${caption || "none"}`);
    } catch (error) {
      // Clear loading line and show error
      process.stdout.write("\r");
      console.error(`❌ Failed to upload/log: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("list entries for a specific day")
  .argument("<yyyy-mm-dd>", "date to list entries for")
  .option("--tags <csv>", "filter by tags (comma-separated)")
  .option("--controller <pubkey>", "filter by specific controller")
  .option("--limit <number>", "limit number of results", (val) => parseInt(val))
  .action(async (day: string, opts) => {
    const tags = opts.tags ? opts.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined;
    const controller = opts.controller || undefined;
    const limit = opts.limit || undefined;

    const rows = await gloss.listDay(day, { tags, controller, limit });
    if (!rows.length) {
      const filterStr = tags ? ` with tags [${tags.join(",")}]` : "";
      console.log(`No entries found for ${day}${filterStr}`);
      return;
    }

    const filterStr = tags ? ` (filtered by tags: ${tags.join(",")})` : "";
    console.log(`\n📝 Entries for ${day}${filterStr}:`);
    console.log("─".repeat(50));

    for (const r of rows) {
      const date = new Date(r.at);
      const timeStr = date.toTimeString().slice(0, 5);
      const tagStr = r.tags?.length ? ` [${r.tags.join(",")}]` : "";
      const controllerStr = r.controller ? ` (${r.controller.slice(0, 8)}...)` : "";

      console.log(`${timeStr} ${r.key}${tagStr}${controllerStr}`);
      console.log(`  ${r.text}`);

      if (r.assets?.length) {
        for (const asset of r.assets) {
          console.log(`  📎 ${asset}`);
        }
      }
      console.log();
    }
  });

program
  .command("get")
  .description("get all log entries for a date")
  .argument("<key>", "date key (YYYY-MM-DD)")
  .action(async (key: string) => {
    const entries = await gloss.get(key);
    if (!entries || entries.length === 0) {
      console.error(`❌ No entries found for: ${key}`);
      process.exit(1);
    }

    console.log(`\n📝 Log Entries: ${key}`);
    console.log(`📊 Total logs: ${entries.length}`);
    console.log("─".repeat(50));

    for (const entry of entries) {
      const date = new Date(entry.at);
      const timeStr = date.toTimeString().slice(0, 5);
      const tagStr = entry.tags?.length ? ` [${entry.tags.join(",")}]` : "";
      const controllerStr = entry.controller ? ` (${entry.controller.slice(0, 8)}...)` : "";

      console.log(`${timeStr} ${entry.key}${tagStr}${controllerStr}`);
      console.log(`  ${entry.text}`);

      if (entry.assets?.length) {
        for (const asset of entry.assets) {
          console.log(`  📎 ${asset}`);
        }
      }
      console.log();
    }
  });

program
  .command("today")
  .description("list today's entries")
  .option("--tags <csv>", "filter by tags (comma-separated)")
  .option("--controller <pubkey>", "filter by specific controller")
  .option("--limit <number>", "limit number of results", (val) => parseInt(val))
  .action(async (opts) => {
    const tags = opts.tags ? opts.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined;
    const controller = opts.controller || undefined;
    const limit = opts.limit || undefined;

    const rows = await gloss.listToday({ tags, controller, limit });
    const today = new Date().toISOString().slice(0, 10);

    if (!rows.length) {
      const filterStr = tags ? ` with tags [${tags.join(",")}]` : "";
      console.log(`No entries found for today (${today})${filterStr}`);
      return;
    }

    const filterStr = tags ? ` (filtered by tags: ${tags.join(",")})` : "";
    console.log(`\n📝 Today's entries (${today})${filterStr}:`);
    console.log("─".repeat(50));

    for (const r of rows) {
      const date = new Date(r.at);
      const timeStr = date.toTimeString().slice(0, 5);
      const tagStr = r.tags?.length ? ` [${r.tags.join(",")}]` : "";
      const controllerStr = r.controller ? ` (${r.controller.slice(0, 8)}...)` : "";

      console.log(`${timeStr} ${r.key}${tagStr}${controllerStr}`);
      console.log(`  ${r.text}`);

      if (r.assets?.length) {
        for (const asset of r.assets) {
          console.log(`  📎 ${asset}`);
        }
      }
      console.log();
    }
  });

program
  .command("remove")
  .description("remove a specific log entry by its unique key")
  .argument("<logKey>", "full log key (YYYY-MM-DD/HHmmss-SSSxxxx)")
  .action(async (logKey: string) => {
    process.stdout.write("🗑️  Removing log... ");

    try {
      const removed = await gloss.removeEntry(logKey);

      process.stdout.write("\r");
      if (removed) {
        console.log(`✅ Removed entry: ${logKey}`);
      } else {
        console.log(`❌ Entry not found: ${logKey}`);
        console.log(`💡 Tip: You can only remove your own entries`);
      }
    } catch (error) {
      process.stdout.write("\r");
      console.error(`❌ Failed to remove: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("remove-day")
  .description("remove all your log entries for a specific date")
  .argument("<date>", "date (YYYY-MM-DD)")
  .option("--confirm", "confirm deletion (required)")
  .action(async (date: string, opts) => {
    if (!opts.confirm) {
      console.error("❌ This will remove ALL your logs for this date!");
      console.error("💡 Add --confirm flag to proceed: gloss remove-day 2025-10-07 --confirm");
      process.exit(1);
    }

    process.stdout.write("🗑️  Removing day-logs... ");

    try {
      const removed = await gloss.removeDay(date);

      process.stdout.write("\r");
      if (removed) {
        console.log(`✅ Removed all entries for ${date}`);
        console.log(`📅 Your entire day chain has been deleted`);
      } else {
        console.log(`❌ No entries found for ${date}`);
        console.log(`💡 Tip: You can only remove your own entries`);
      }
    } catch (error) {
      process.stdout.write("\r");
      console.error(`❌ Failed to remove day: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("update")
  .description("update a specific log entry by its unique key")
  .argument("<logKey>", "full log key (YYYY-MM-DD/HHmmss-SSSxxxx)")
  .argument("<newText>", "new text for the entry")
  .option("-t, --tags <csv>", "new tags for the entry")
  .action(async (logKey: string, newText: string, opts) => {
    const tags = (opts.tags ? String(opts.tags).split(",") : undefined)?.map((s: string) => s.trim()).filter(Boolean);

    process.stdout.write("✏️  Updating on blockchain... ");

    try {
      const updatedEntry = await gloss.updateEntryByKey(logKey, newText, { tags });

      process.stdout.write("\r");
      if (updatedEntry) {
        console.log(`✅ Updated entry: ${logKey}`);
        console.log(`📝 New: "${newText}"`);
        if (tags?.length) {
          console.log(`🏷️  Tags: [${tags.join(",")}]`);
        }
      } else {
        console.log(`❌ Entry not found: ${logKey}`);
        console.log(`💡 Tip: You can only update your own entries`);
      }
    } catch (error) {
      process.stdout.write("\r");
      console.error(`❌ Failed to update: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("history")
  .description("view the full history of a specific log entry")
  .argument("<logKey>", "full log key (YYYY-MM-DD/HHmmss-mmm)")
  .action(async (logKey: string) => {
    try {
      const history = await gloss.getLogHistory(logKey);

      if (history.length === 0) {
        console.log(`❌ No history found for: ${logKey}`);
        return;
      }

      console.log(`\n📚 History for: ${logKey}`);
      console.log(`📊 Total versions: ${history.length}`);
      console.log("─".repeat(50));

      history.forEach((entry, index: number) => {
        const date = new Date(entry.at);
        const timeStr = date.toTimeString().slice(0, 8);
        const tagStr = entry.tags?.length ? ` [${entry.tags.join(',')}]` : '';
        const versionLabel = index === 0 ? ' (current)' : ` (v${history.length - index})`;

        console.log(`${timeStr}${versionLabel}${tagStr}`);
        console.log(`  ${entry.text}`);

        if (entry.assets?.length) {
          for (const asset of entry.assets) {
            console.log(`  📎 ${asset}`);
          }
        }
        console.log();
      });
    } catch (error) {
      console.error(`❌ Failed to get history: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse();
