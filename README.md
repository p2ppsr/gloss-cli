# Gloss CLI

Global developer logging CLI.

Zero‑friction dev logs from your terminal. Write a line, paste a screenshot, and hit enter. 
Images are uploaded to UHRP via `@bsv/sdk`'s `StorageUploader`. All entries are stored using `GlobalKVStore` 
with each log as an individual spendable UTXO for true blockchain semantics.

## Quick start

```bash
# Install globally
npm install -g gloss-cli

# Or install for development
npm i && npm run build && npm link

# Set env (examples)
export UHRP_URL="https://nanostore.babbage.systems"
export UHRP_RETENTION_MIN=$((60*24*30))   # 30 days
export WALLET_HOST="localhost"
export WALLET_MODE="auto"                 # or "http"

# Log something
gloss log "wired OAuth callback; caching fixed" -t auth,infra

# Upload an image
gloss snap ./screens/trace.png -c "latency spike around 14:27"

# View today's logs
gloss today

# Remove a specific log by unique key
gloss remove 2025-10-07/143022-456

# Update a log entry
gloss update 2025-10-07 "old text" "new text" --tags updated

# View update history
gloss history 2025-10-07/143022-456
```
> Uploads require a compatible wallet endpoint (per `@bsv/sdk`) reachable at `WALLET_HOST`.
> If not available, `snap` will fail gracefully.

## Commands

### Core Logging
- `gloss log "<message>" [-t csvTags]`  
  Creates a new log entry with timestamp and optional tags. Each log gets a unique UTXO.

- `gloss snap <path> [-c caption]`  
  Uploads file to UHRP and creates a log entry with the UHRP URL.

### Viewing Logs
- `gloss today [--tags csvTags]`  
  Lists today's entries, optionally filtered by tags.

- `gloss list <YYYY-MM-DD> [--tags csvTags]`  
  Lists all entries for the specified date.

- `gloss get <YYYY-MM-DD>`  
  Retrieves all entries for a specific date.

### Log Management
- `gloss remove <key-or-date> [text]`  
  Remove a log by unique key (`2025-10-07/143022-456`) or date + text.

- `gloss remove-day <YYYY-MM-DD> [--confirm]`  
  Remove all your log entries for a specific date.

- `gloss update <date> "<old-text>" "<new-text>" [--tags csvTags]`  
  Update a log entry's text and/or tags. Preserves history.

- `gloss history <key>`  
  View the complete update history of a specific log entry.

## Environment variables

- `UHRP_URL` — UHRP storage URL (default: `https://nanostore.babbage.systems`)
- `UHRP_RETENTION_MIN` — minutes to retain files (default: 30 days)
- `WALLET_HOST` — wallet host (default: `localhost`)
- `WALLET_MODE` — `auto` or `http` (default: `auto`)
- `NETWORK_PRESET` — BSV network to use (default: `mainnet`)

## Architecture

### Individual UTXO Design
- **Each log = Individual UTXO**: Every log entry creates its own spendable transaction
- **Unique Keys**: Logs have timestamped keys like `2025-10-07/143022-456`
- **Granular Operations**: Remove, update, or query individual logs without affecting others
- **True Blockchain Semantics**: Leverage spend chains for audit trails and history

### Data Storage
- All data stored in `GlobalKVStore` with protocol ID `[1, 'gloss logs']`
- Keys format: `entry/YYYY-MM-DD/HHmmss-mmm`
- Updates create spend chains preserving complete history
- No local files - everything on BSV blockchain

### Benefits
- **Individual UTXOs**: Each log is its own spendable transaction
- **Granular Removal**: Delete specific entries without affecting others  
- **Update History**: Complete audit trail of all changes
- **Global Discovery**: All developers' logs discoverable via protocol ID

## License

Open BSV License
