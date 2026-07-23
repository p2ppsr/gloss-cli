# Gloss CLI

Global developer logging CLI.

Zero-friction dev logs from your terminal. Write a line, paste a screenshot,
and hit enter. Images are uploaded to UHRP via `@bsv/sdk`'s
`StorageUploader`. Entries are stored in `GlobalKVStore` using one active
token per controller and local calendar day.

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

# Legacy removal currently advances/removes the whole day token
gloss remove 2025-10-07/143022-456

# Update a log entry
gloss update 2025-10-07 "old text" "new text" --tags updated

# View update history
gloss history 2025-10-07/143022-456
```
> Uploads require a compatible wallet endpoint (per `@bsv/sdk`) reachable at `WALLET_HOST`.
> If not available, `snap` will fail gracefully.

Normal commands report only their final result. Individual overlay-host errors
that the SDK encounters while retrying or reconciling a successful operation
are intentionally hidden. If the operation ultimately fails, Gloss exits
nonzero and prints one concise error.

## Commands

### Core Logging
- `gloss log "<message>" [-t csvTags]`  
  Appends a timestamped entry to the controller's day-token spend chain.

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
- `gloss remove <key>`
  Legacy compatibility command. With the day-token architecture this currently
  removes the controller's whole day token, not only the logical entry.

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

### Day-Token Spend Chain

- **One active day token**: A controller has one active GlobalKVStore token for
  each local calendar day.
- **Spend-chain history**: Each write spends the previous day token. Reads use
  `history: true` to reconstruct the day's prior entries.
- **Logical identity**: An entry is identified by its controller and timestamped
  key, such as `2025-10-07/143022-456`, not by a transaction ID.
- **Exact transaction metadata**: A TXID is shown only when the storage response
  identifies the transaction for that exact value.

### Data Storage
- All data stored in `GlobalKVStore` with protocol ID `[1, 'gloss logs']`
- Day keys use `entry/YYYY-MM-DD`; log values retain timestamped logical keys.
- Writes and updates advance the day-token spend chain.
- No local files - everything on BSV blockchain

### Benefits
- **Native history**: Bitcoin's chain of spends provides the ordered history.
- **Stable logical entries**: Multiple posts from one day remain distinct even
  when historical transaction metadata is unavailable.
- **Update history**: Entry revisions are reconstructed from spend history.
- **Global Discovery**: All developers' logs discoverable via protocol ID

## License

Open BSV License
