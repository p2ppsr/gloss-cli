#!/usr/bin/env node
import { Command } from "commander";
import { uploadBytes } from "./uploader.js";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { nextIdForDay, putEntry, listDay, getEntry } from "./kv.js";

const program = new Command();
program.name("gloss").description("tiny developer log").version("0.1.0");

program
  .command("log")
  .description("log a message to GlobalKVStore (discoverable via gloss logs protocol)")
  .argument("<message...>", "what changed?")
  .option("-t, --tags <csv>", "tags like auth,infra")
  .action(async (message, opts) => {
    const text = String(message.join(" "));
    const tags = (opts.tags ? String(opts.tags).split(",") : []).map((s: string) => s.trim()).filter(Boolean);

    const day = new Date().toISOString().slice(0, 10);
    const key = await nextIdForDay(day); // This now returns the day itself

    // Show loading indicator
    process.stdout.write("📝 Logging to blockchain... ");
    
    try {
      await putEntry({
        key,
        at: new Date().toISOString(),
        text,
        tags,
        assets: []
      });

      // Clear loading line and show success
      process.stdout.write("\r");
      console.log(`Logged ✓  Key: ${key}`);
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
    
    // Upload asset first
    process.stdout.write("📤 Uploading to UHRP... ");
    const { uhrpURL } = await uploadBytes(new Uint8Array(buf), mime);
    process.stdout.write("✓\n");
    
    const caption = String(opts.caption ?? "");
    const day = new Date().toISOString().slice(0, 10);
    const key = await nextIdForDay(day); // This now returns the day itself
    const text = `asset ${basename(path)} -> ${uhrpURL}${caption ? ` (${caption})` : ""}`;

    // Log to blockchain
    process.stdout.write("📝 Logging to blockchain... ");
    
    try {
      await putEntry({
        key,
        at: new Date().toISOString(),
        text,
        tags: ["asset"],
        assets: [uhrpURL]
      });

      // Clear loading line and show success
      process.stdout.write("\r");
      console.log(`Uploaded ✓  ${uhrpURL}`);
      console.log(`Logged ✓   Key: ${key}`);
      console.log(`Caption: ${caption || "none"}`);
    } catch (error) {
      // Clear loading line and show error
      process.stdout.write("\r");
      console.error(`❌ Failed to log: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("list entries for a specific day")
  .argument("<yyyy-mm-dd>", "date to list entries for")
  .action(async (day: string) => {
    const rows = await listDay(day);
    if (!rows.length) {
      console.log(`No entries found for ${day}`);
      return;
    }

    console.log(`\n📝 Entries for ${day}:`);
    console.log("─".repeat(50));

    for (const r of rows) {
      const date = new Date(r.at);
      const timeStr = date.toTimeString().slice(0, 5);
      const tagStr = r.tags?.length ? ` [${r.tags.join(",")}]` : "";

      console.log(`${timeStr} ${r.key}${tagStr}`);
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
  .description("get a specific entry by key")
  .argument("<key>", "entry key (YYYY-MM-DD/NNNN)")
  .action(async (key: string) => {
    const entry = await getEntry(key);
    if (!entry) {
      console.error(`❌ Entry not found: ${key}`);
      process.exit(1);
    }

    const date = new Date(entry.at);
    const timeStr = date.toTimeString().slice(0, 5);
    const tagStr = entry.tags?.length ? ` [${entry.tags.join(",")}]` : "";

    console.log(`\n📝 Entry: ${entry.key}`);
    console.log(`⏰ Time: ${timeStr} (${entry.at})`);
    console.log(`💬 Text: ${entry.text}`);

    if (entry.tags?.length) {
      console.log(`🏷️  Tags: ${entry.tags.join(", ")}`);
    }

    if (entry.assets?.length) {
      console.log(`📎 Assets:`);
      for (const asset of entry.assets) {
        console.log(`   ${asset}`);
      }
    }
  });

program
  .command("today")
  .description("list today's entries")
  .action(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await listDay(today);
    if (!rows.length) {
      console.log(`No entries found for today (${today})`);
      return;
    }

    console.log(`\n📝 Today's entries (${today}):`);
    console.log("─".repeat(50));

    for (const r of rows) {
      const date = new Date(r.at);
      const timeStr = date.toTimeString().slice(0, 5);
      const tagStr = r.tags?.length ? ` [${r.tags.join(",")}]` : "";

      console.log(`${timeStr} ${r.key}${tagStr}`);
      console.log(`  ${r.text}`);

      if (r.assets?.length) {
        for (const asset of r.assets) {
          console.log(`  📎 ${asset}`);
        }
      }
      console.log();
    }
  });

program.parseAsync(process.argv);
