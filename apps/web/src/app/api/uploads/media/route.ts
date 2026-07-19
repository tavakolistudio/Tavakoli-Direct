import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/guards';
import { uploadMedia } from '@/server/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Admin-only media upload (audio or image) used by the automation steps editor. */
export async function POST(request: Request): Promise<Response> {
  await requireAdmin();

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'فایلی ارسال نشد.' }, { status: 400 });
  }

  const result = await uploadMedia(file);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ url: result.url });
}
