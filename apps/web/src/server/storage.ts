import 'server-only';
import { randomBytes } from 'node:crypto';
import { env } from '@tavakoli/config';

/**
 * Uploads media to Supabase Storage and returns a public URL.
 *
 * The URL must be publicly readable because Meta fetches the file itself — it
 * cannot be handed the bytes. Object names are random, so a link is unguessable
 * even though the bucket is public; still, nothing private belongs here.
 */
export const MEDIA_BUCKET = 'media';

/** Formats Instagram accepts for voice messages. */
export const AUDIO_MIME_TYPES = ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mpeg'] as const;

export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export function isStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'audio/mpeg') return 'mp3';
  return 'm4a';
}

export interface UploadResult {
  url?: string;
  error?: string;
}

export async function uploadAudio(file: File): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return { error: 'فضای ذخیره‌سازی هنوز تنظیم نشده است.' };
  }
  if (!(AUDIO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { error: 'فقط فایل m4a یا mp3 پذیرفته می‌شود.' };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: 'حجم فایل نباید بیشتر از ۸ مگابایت باشد.' };
  }

  const base = env.SUPABASE_URL!.replace(/\/$/, '');
  const objectName = `audio/${randomBytes(16).toString('hex')}.${extensionFor(file.type)}`;

  const res = await fetch(`${base}/storage/v1/object/${MEDIA_BUCKET}/${objectName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Content-Type': file.type,
      'x-upsert': 'false',
    },
    body: new Uint8Array(await file.arrayBuffer()),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Never surface the service key or full storage response to the browser.
    console.error('supabase storage upload failed:', res.status, detail.slice(0, 200));
    return { error: 'آپلود ناموفق بود. دوباره تلاش کنید.' };
  }

  return { url: `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${objectName}` };
}
