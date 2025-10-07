import { WalletInterface } from '@bsv/sdk';

export type GlossCliConfig = {
  siteTitle: string;
  timezone: string;
  uhrpURL: string;
  retentionMinutes: number;
  walletMode: 'auto' | 'json-api';
  networkPreset: 'mainnet' | 'testnet';
};

export const loadConfig = (): GlossCliConfig => ({
  siteTitle: process.env.GLOSS_SITE_TITLE ?? "notes",
  timezone: process.env.TZ ?? "America/Los_Angeles",
  uhrpURL: process.env.UHRP_URL ?? "https://nanostore.babbage.systems",
  retentionMinutes: Number(process.env.UHRP_RETENTION_MIN ?? 60 * 24 * 30),
  walletMode: (process.env.WALLET_MODE as 'auto' | 'json-api') ?? "auto",
  networkPreset: (process.env.BSV_NETWORK as 'mainnet' | 'testnet') ?? "mainnet",
});
