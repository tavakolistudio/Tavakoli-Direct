import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'حذف داده‌های کاربر',
  description:
    'راهنمای درخواست حذف داده‌های کاربر در سرویس دایرکت هوشمند توکلی استودیو (User Data Deletion Instructions).',
  alternates: { canonical: '/data-deletion' },
};

export default function DataDeletionPage(): React.ReactElement {
  return (
    <main className="bg-canvas min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <Link href="/" className="text-brand-dark text-sm hover:underline">
          ← بازگشت به صفحهٔ اصلی
        </Link>

        <h1 className="mt-6 text-3xl font-bold">حذف داده‌های کاربر</h1>

        <div className="mt-8 space-y-8 leading-8 text-neutral-700">
          <section>
            <p>
              اگر با یکی از پیج‌های اینستاگرامی که از سرویس «دایرکت هوشمند توکلی استودیو» استفاده
              می‌کنند گفتگو کرده‌اید و می‌خواهید داده‌های شما حذف شود، می‌توانید درخواست حذف ثبت
              کنید. درخواست شما رایگان است.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">چطور درخواست حذف بدهم؟</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2">
              <li>
                یک ایمیل به{' '}
                <a href="mailto:tavakolipix@gmail.com" className="text-brand-dark hover:underline">
                  tavakolipix@gmail.com
                </a>{' '}
                با موضوع <strong>«درخواست حذف داده» / «Data Deletion Request»</strong> بفرستید.
              </li>
              <li>
                در متن ایمیل، <strong>نام کاربری اینستاگرام</strong> خود و <strong>نام پیجی</strong>{' '}
                که با آن گفتگو کرده‌اید را بنویسید.
              </li>
              <li>
                ما هویت درخواست را بررسی می‌کنیم و داده‌های شما را{' '}
                <strong>حداکثر ظرف ۳۰ روز</strong> حذف می‌کنیم و نتیجه را به شما اطلاع می‌دهیم.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">چه چیزهایی حذف می‌شود</h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>پروفایل مخاطب شما (نام کاربری، نام نمایشی، شناسهٔ اینستاگرام)</li>
              <li>اطلاعات تماسی که ارسال کرده‌اید (مانند شماره تماس یا ایمیل)</li>
              <li>متن گفتگوها و پیام‌های ذخیره‌شدهٔ شما</li>
              <li>برچسب‌ها، وضعیت سرنخ و یادداشت‌های مرتبط با شما</li>
            </ul>
            <p className="mt-3">
              داده‌های خام رویدادهای وبهوک نیز به‌صورت خودکار طبق سیاست نگه‌داری (پیش‌فرض ۳۰ روز)
              حذف می‌شوند.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">تماس</h2>
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
            <p className="mt-3">
              جزئیات بیشتر در{' '}
              <Link href="/privacy" className="text-brand-dark hover:underline">
                سیاست حریم خصوصی
              </Link>{' '}
              آمده است.
            </p>
          </section>

          <hr className="border-neutral-200" />

          <section dir="ltr" className="text-left">
            <h2 className="text-xl font-bold text-neutral-900">
              User Data Deletion Instructions (English)
            </h2>
            <p className="mt-3">
              If you have messaged an Instagram account that uses Tavakoli Direct (operated by
              Tavakoli Studio) and you want your data removed, email{' '}
              <a href="mailto:tavakolipix@gmail.com" className="text-brand-dark hover:underline">
                tavakolipix@gmail.com
              </a>{' '}
              with the subject <strong>&quot;Data Deletion Request&quot;</strong>, including your
              Instagram username and the account you messaged.
            </p>
            <p className="mt-3">
              We verify the request and delete your contact profile, stored conversations and
              messages, any contact details you provided, and related tags, lead status and notes
              within <strong>30 days</strong>, then confirm by email. Raw webhook payloads are also
              purged automatically under a limited retention policy (30 days by default). This
              service is free of charge.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
