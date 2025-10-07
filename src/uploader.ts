import { StorageUploader, WalletClient } from "@bsv/sdk";
import { loadConfig } from "./config.js";
import crypto from 'crypto'
(global as any).self = { crypto }

export type UploadResult = {
  uhrpURL: string;
  published: boolean;
};

export async function uploadBytes(
  data: Uint8Array,
  mimeType: string
): Promise<UploadResult> {
  const cfg = loadConfig();

  const wallet = new WalletClient(cfg.walletMode, `http://${cfg.walletHost}`);

  // Note: Constructor shape may vary slightly by SDK version.
  const uploader = new StorageUploader({
    storageURL: cfg.uhrpURL,
    wallet
  } as any);

  const res: any = await uploader.publishFile({
    file: { data, type: mimeType },
    retentionPeriod: cfg.retentionMinutes
  } as any);

  return { uhrpURL: String(res.uhrpURL ?? res.url), published: Boolean(res.published ?? true) };
}
