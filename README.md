# Gloss (TypeScript CLI)

Zero‑friction dev log you run from the terminal. Write a line, paste a screenshot, and hit enter. 
Images are uploaded to UHRP via `@bsv/sdk`'s `StorageUploader`. All entries are stored using `LocalKVStore` 
for persistent, on-chain logging.

## Quick start

```bash
# 1) Install deps
npm i

# 2) Build
npm run build

# 3) Link (optional, to use `gloss` globally)
npm link

# 4) Set env (examples)
export UHRP_URL="https://nanostore.babbage.systems"
export UHRP_RETENTION_MIN=$((60*24*30))   # 30 days
export WALLET_HOST="localhost"
export WALLET_MODE="auto"                 # or "http"

# 5) Log something
gloss log "wired OAuth callback; caching fixed" -t auth,infra

# 6) Upload an image and store in KV
gloss snap ./screens/trace.png -c "latency spike around 14:27"
```
> Uploads require a compatible wallet endpoint (per `@bsv/sdk`) reachable at `WALLET_HOST`.
> If not available, `snap` will fail gracefully.

## Commands

- `gloss log "<message>" [-t csvTags]`  
  Creates a new log entry in LocalKVStore with timestamp and optional tags.

- `gloss snap <path> [-c caption]`  
  Uploads the file to UHRP and creates a log entry with the UHRP URL.

- `gloss list <YYYY-MM-DD>`  
  Lists all entries for the specified date from LocalKVStore.

- `gloss get <YYYY-MM-DD/NNNN>`  
  Retrieves a specific entry by key from LocalKVStore.

- `gloss today`  
  Lists all entries for today.

## Environment variables

- `UHRP_URL` — UHRP storage URL (default: `https://nanostore.babbage.systems`)
- `UHRP_RETENTION_MIN` — minutes to retain files (default: 30 days)
- `WALLET_HOST` — wallet host (default: `localhost`)
- `WALLET_MODE` — `auto` or `http` (default: `auto`)
- `GLOSS_KV_CONTEXT` — KV namespace/bucket (default: `gloss/logs`)
- `GLOSS_KV_PUBLIC` — `true|false`, store values unencrypted for public reads (default: `false`)

## Notes

- All data is stored in LocalKVStore using keys like `entry/YYYY-MM-DD/NNNN`.
- A per-day counter (`counter/YYYY-MM-DD`) tracks entry sequences for each day.
- No local files are created - everything is stored on-chain via LocalKVStore.

## License

MIT
