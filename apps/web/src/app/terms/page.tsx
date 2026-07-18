import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'شرایط استفاده',
  description:
    'شرایط استفاده از سرویس دایرکت هوشمند توکلی استودیو، ویژهٔ مجموعه‌های عضو باشگاه مشتریان.',
  alternates: { canonical: '/terms' },
};

const UPDATED = '۲۷ تیر ۱۴۰۵';

export default function TermsPage(): React.ReactElement {
  return (
    <main className="bg-canvas min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <Link href="/" className="text-brand-dark text-sm hover:underline">
          ← بازگشت به صفحهٔ اصلی
        </Link>

        <h1 className="mt-6 text-3xl font-bold">شرایط استفاده</h1>
        <p className="mt-2 text-sm text-neutral-500">آخرین به‌روزرسانی: {UPDATED}</p>

        <div className="mt-8 space-y-8 leading-8 text-neutral-700">
          <section>
            <h2 className="text-xl font-bold text-neutral-900">۱. پذیرش شرایط</h2>
            <p className="mt-3">
              «دایرکت هوشمند توکلی استودیو» (Tavakoli Direct) سرویسی است که توسط توکلی استودیو ارائه
              می‌شود. استفاده از این سرویس به‌معنای پذیرش این شرایط است.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۲. دسترسی</h2>
            <p className="mt-3">
              این سرویس <strong>عمومی نیست</strong> و ثبت‌نام آزاد ندارد. دسترسی فقط برای مجموعه‌های
              عضو باشگاه مشتریان توکلی استودیو و اعضای مجاز تیم فراهم می‌شود. حساب‌های کاربری توسط
              مدیر ساخته می‌شوند و اشتراک‌گذاری آن‌ها مجاز نیست.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۳. اتصال پیج اینستاگرام</h2>
            <p className="mt-3">
              اتصال هر پیج تنها با تأیید صریح مالک آن و از راه فرایند رسمی Meta انجام می‌شود. ما
              هیچ‌گاه رمز عبور اینستاگرام درخواست نمی‌کنیم و از روش‌های غیررسمی یا اسکرپینگ استفاده
              نمی‌کنیم. مالک پیج می‌تواند در هر زمان دسترسی را قطع کند.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۴. استفادهٔ مجاز</h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>ارسال پیام انبوه ناخواسته (اسپم) مجاز نیست.</li>
              <li>محتوای ارسالی نباید خلاف قوانین Meta/Instagram یا قوانین جاری باشد.</li>
              <li>
                پاسخ‌های خودکار تنها در چارچوب قوانین پیام‌رسانی اینستاگرام (از جمله پنجرهٔ زمانی
                پاسخ‌گویی) ارسال می‌شوند.
              </li>
              <li>سوءاستفاده از سرویس موجب تعلیق دسترسی می‌شود.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۵. محدودیت‌های سرویس</h2>
            <p className="mt-3">
              بخشی از قابلیت‌ها به مجوزها و محدودیت‌های Meta وابسته است و ممکن است بسته به وضعیت
              تأیید اپ یا تغییرات Meta در دسترس نباشد. ما تضمینی برای در دسترس بودن دائمی APIهای
              Meta نمی‌دهیم.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۶. داده‌ها و حریم خصوصی</h2>
            <p className="mt-3">
              نحوهٔ جمع‌آوری و نگه‌داری داده‌ها در{' '}
              <Link href="/privacy" className="text-brand-dark hover:underline">
                سیاست حریم خصوصی
              </Link>{' '}
              توضیح داده شده است. درخواست حذف داده از راه{' '}
              <Link href="/data-deletion" className="text-brand-dark hover:underline">
                این صفحه
              </Link>{' '}
              ممکن است.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۷. تماس</h2>
            <p className="mt-3">
              توکلی استودیو — استانبول، ترکیه
              <br />
              ایمیل:{' '}
              <a href="mailto:tavakolipix@gmail.com" className="text-brand-dark hover:underline">
                tavakolipix@gmail.com
              </a>
              <br />
              تلفن: <span dir="ltr">+90 501 696 7777</span>
            </p>
          </section>

          <hr className="border-neutral-200" />

          <section dir="ltr" className="text-left">
            <h2 className="text-xl font-bold text-neutral-900">
              Terms of Service (English summary)
            </h2>
            <p className="mt-3">
              Tavakoli Direct is a private service operated by Tavakoli Studio (Istanbul, Turkey),
              available only to businesses in the Tavakoli Studio customer club. There is no public
              signup; accounts are created by an administrator.
            </p>
            <p className="mt-3">
              Instagram accounts are connected only with the explicit consent of their owner through
              Meta&apos;s official flow. We never request Instagram passwords and never use
              unofficial APIs or scraping. Owners may disconnect at any time. Unsolicited bulk
              messaging (spam) is prohibited, and all automated replies operate within
              Instagram&apos;s messaging rules. Feature availability depends on Meta permissions and
              may change. See our{' '}
              <Link href="/privacy" className="text-brand-dark hover:underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/data-deletion" className="text-brand-dark hover:underline">
                data deletion instructions
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
