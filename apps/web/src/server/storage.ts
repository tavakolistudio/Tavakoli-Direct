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

/** Formats Instagram accepts, mapped to the extension we store them under. */
const ALLOWED: Record<string, { ext: string; maxBytes: number }> = {
  'audio/mp4': { ext: 'm4a', maxBytes: 8 * 1024 * 1024 },
  'audio/m4a': { ext: 'm4a', maxBytes: 8 * 1024 * 1024 },
  'audio/x-m4a': { ext: 'm4a', maxBytes: 8 * 1024 * 1024 },
  'audio/mpeg': { ext: 'mp3', maxBytes: 8 * 1024 * 1024 },
  'image/jpeg': { ext: 'jpg', maxBytes: 8 * 1024 * 1024 },
  'image/png': { ext: 'png', maxBytes: 8 * 1024 * 1024 },
};

export function isStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface UploadResult {
  url?: string;
  error?: string;
}

export async function uploadMedia(file: File): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    return { error: 'فضای ذخیره‌سازی هنوز تنظیم نشده است.' };
  }

  const spec = ALLOWED[file.type];
  if (!spec) {
    return { error: 'فقط فایل m4a، mp3، jpg یا png پذیرفته می‌شود.' };
  }
  if (file.size > spec.maxBytes) {
    return { error: 'حجم فایل نباید بیشتر از ۸ مگابایت باشد.' };
  }

  const base = env.SUPABASE_URL!.replace(/\/$/, '');
  const folder = file.type.startsWith('audio/') ? 'audio' : 'image';
  const objectName = `${folder}/${randomBytes(16).toString('hex')}.${spec.ext}`;

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
