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

/**
 * Formats Instagram accepts, mapped to the extension we store them under.
 *
 * Audio is the narrow one: Meta's send-message API documents exactly
 * aac, m4a, wav and mp4 for the "audio" attachment type — mp3 is NOT on that
 * list. An mp3 upload used to succeed here and then fail silently at send time
 * ("This attachment format is not supported"), which is why mp3 is rejected at
 * upload instead of accepted and only found broken later.
 */
const ALLOWED: Record<string, { ext: string; maxBytes: number }> = {
  'audio/mp4': { ext: 'm4a', maxBytes: 8 * 1024 * 1024 },
  'audio/m4a': { ext: 'm4a', maxBytes: 8 * 1024 * 1024 },
  'audio/x-m4a': { ext: 'm4a', maxBytes: 8 * 1024 * 1024 },
  'audio/aac': { ext: 'aac', maxBytes: 8 * 1024 * 1024 },
  'audio/wav': { ext: 'wav', maxBytes: 8 * 1024 * 1024 },
  'audio/x-wav': { ext: 'wav', maxBytes: 8 * 1024 * 1024 },
  'audio/wave': { ext: 'wav', maxBytes: 8 * 1024 * 1024 },
  'image/jpeg': { ext: 'jpg', maxBytes: 8 * 1024 * 1024 },
  'image/png': { ext: 'png', maxBytes: 8 * 1024 * 1024 },
  // Video gets a bigger budget; Instagram accepts noticeably larger clips.
  'video/mp4': { ext: 'mp4', maxBytes: 25 * 1024 * 1024 },
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
    return {
      error:
        file.type === 'audio/mpeg'
          ? 'فایل mp3 پذیرفته نمی‌شود — اینستاگرام آن را نمایش نمی‌دهد. از m4a، aac یا wav استفاده کنید (دکمهٔ ضبط صدا هم m4a می‌سازد).'
          : 'فقط فایل m4a، aac، wav، jpg، png یا mp4 پذیرفته می‌شود.',
    };
  }
  if (file.size > spec.maxBytes) {
    const mb = Math.round(spec.maxBytes / (1024 * 1024));
    return { error: `حجم فایل نباید بیشتر از ${mb} مگابایت باشد.` };
  }

  const base = env.SUPABASE_URL!.replace(/\/$/, '');
  const folder = file.type.startsWith('audio/')
    ? 'audio'
    : file.type.startsWith('video/')
      ? 'video'
      : 'image';
  const objectName = `${folder}/${randomBytes(16).toString('hex')}.${spec.ext}`;

  const res = await fetch(`${base}/storage/v1/object/${MEDIA_BUCKET}/${objectName}`, {
    method: 'POST',
    headers: {
      // Legacy service_role keys are JWTs and go in Authorization; the newer
      // sb_secret_* keys are not JWTs and are accepted via apikey. Sending both
      // means either style of key works.
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY!}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
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
