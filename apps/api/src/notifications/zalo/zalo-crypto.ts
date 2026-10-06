import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Credentials } from 'zca-js/dist/zalo';

export type ZaloCredentials = {
  cookie: Credentials['cookie'];
  imei: string;
  userAgent: string;
};

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

function keyFromEnv() {
  const value = process.env.ZALO_CREDENTIALS_KEY;
  if (!value) throw new Error('ZALO_CREDENTIALS_KEY chưa được cấu hình');
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('ZALO_CREDENTIALS_KEY phải là 32 byte (hex 64 ký tự hoặc base64)');
  return key;
}

export function encryptZaloCredentials(credentials: ZaloCredentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromEnv(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
  return JSON.stringify({ iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') } satisfies EncryptedPayload);
}

export function decryptZaloCredentials(value: string): ZaloCredentials {
  const payload = JSON.parse(value) as EncryptedPayload;
  const decipher = createDecipheriv('aes-256-gcm', keyFromEnv(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const raw = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]);
  const credentials = JSON.parse(raw.toString('utf8')) as ZaloCredentials;
  if (!credentials.imei || !credentials.userAgent || !credentials.cookie) throw new Error('Zalo credentials không hợp lệ');
  return credentials;
}
