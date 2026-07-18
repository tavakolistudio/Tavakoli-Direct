import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'سیاست حریم خصوصی',
  description:
    'سیاست حریم خصوصی سرویس دایرکت هوشمند توکلی استودیو — چه داده‌هایی جمع‌آوری می‌شود، چگونه نگه‌داری می‌شود و چگونه می‌توان آن را حذف کرد.',
  alternates: { canonical: '/privacy' },
};

const UPDATED = '۲۷ تیر ۱۴۰۵';

export default function PrivacyPage(): React.ReactElement {
  return (
    <main className="bg-canvas min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <Link href="/" className="text-brand-dark text-sm hover:underline">
          ← بازگشت به صفحهٔ اصلی
        </Link>

        <h1 className="mt-6 text-3xl font-bold">سیاست حریم خصوصی</h1>
        <p className="mt-2 text-sm text-neutral-500">آخرین به‌روزرسانی: {UPDATED}</p>

        <div className="mt-8 space-y-8 leading-8 text-neutral-700">
          <section>
            <h2 className="text-xl font-bold text-neutral-900">۱. ما چه کسی هستیم</h2>
            <p className="mt-3">
              «دایرکت هوشمند توکلی استودیو» (Tavakoli Direct) سرویسی است که توسط توکلی استودیو
              (Tavakoli Studio) ارائه می‌شود و برای مدیریت و پاسخ‌گویی خودکار به پیام‌های اینستاگرام
              مجموعه‌های عضو باشگاه مشتریان به‌کار می‌رود. این سرویس عمومی نیست و ثبت‌نام آزاد
              ندارد.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۲. چه داده‌هایی جمع‌آوری می‌کنیم</h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>
                <strong>داده‌های پیام‌رسانی اینستاگرام:</strong> شناسهٔ کاربری اینستاگرام
                (Instagram-scoped ID)، نام کاربری، متن پیام‌ها و کامنت‌ها، و زمان آن‌ها — تنها برای
                پیج‌هایی که مالکشان صراحتاً اتصال را تأیید کرده است.
              </li>
              <li>
                <strong>اطلاعات تماسی که کاربر خودش می‌فرستد:</strong> مانند شماره تماس یا ایمیل، در
                صورتی که کاربر در گفتگو آن را ارسال کند.
              </li>
              <li>
                <strong>داده‌های حساب کاربری تیم:</strong> نام، ایمیل و رمز عبور رمزنگاری‌شده
                (Argon2id) اعضای تیم توکلی استودیو.
              </li>
              <li>
                <strong>توکن‌های دسترسی:</strong> توکن‌های اینستاگرام به‌صورت رمزنگاری‌شده
                (AES-256-GCM) ذخیره می‌شوند و هرگز در مرورگر نمایش داده نمی‌شوند.
              </li>
            </ul>
            <p className="mt-3">
              ما هیچ‌گاه <strong>رمز عبور اینستاگرام</strong> شما را درخواست یا ذخیره نمی‌کنیم.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">
              ۳. چرا این داده‌ها را پردازش می‌کنیم
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>ارسال پاسخ خودکار به پیام‌ها و کامنت‌های دریافتی</li>
              <li>نمایش گفتگوها در صندوق پیام مشترک برای پاسخ‌گویی انسانی</li>
              <li>ثبت و پیگیری سرنخ‌های فروش برای مجموعهٔ صاحب پیج</li>
              <li>تهیهٔ گزارش‌های عملکرد بر پایهٔ رویدادهای واقعی</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۴. اشتراک‌گذاری داده‌ها</h2>
            <p className="mt-3">
              داده‌ها <strong>فروخته نمی‌شوند</strong> و برای تبلیغات در اختیار اشخاص ثالث قرار
              نمی‌گیرند. داده‌ها فقط با ارائه‌دهندگان زیرساخت که برای اجرای سرویس لازم‌اند (میزبانی،
              پایگاه‌داده و صف پیام) و با خودِ Meta/Instagram از راه APIهای رسمی مبادله می‌شوند.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۵. نگه‌داری داده‌ها</h2>
            <p className="mt-3">
              پیام‌ها و اطلاعات مخاطبان تا زمانی نگه‌داری می‌شوند که مجموعهٔ صاحب پیج به آن‌ها نیاز
              دارد. داده‌های خام رویدادهای وبهوک طبق یک سیاست نگه‌داری محدود (به‌صورت پیش‌فرض ۳۰
              روز) به‌طور خودکار حذف می‌شوند.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۶. حقوق شما و حذف داده‌ها</h2>
            <p className="mt-3">
              شما می‌توانید درخواست <strong>مشاهده، خروجی گرفتن یا حذف</strong> داده‌های خود را ثبت
              کنید. راهنمای کامل حذف داده‌ها در صفحهٔ{' '}
              <Link href="/data-deletion" className="text-brand-dark hover:underline">
                حذف داده‌های کاربر
              </Link>{' '}
              آمده است. همچنین می‌توانید مستقیماً به{' '}
              <a href="mailto:tavakolipix@gmail.com" className="text-brand-dark hover:underline">
                tavakolipix@gmail.com
              </a>{' '}
              ایمیل بزنید.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۷. امنیت</h2>
            <p className="mt-3">
              رمزهای عبور با Argon2id هش می‌شوند، توکن‌ها با AES-256-GCM رمزنگاری می‌شوند، ارتباطات
              روی HTTPS انجام می‌شود و درخواست‌های ورودی وبهوک با امضای رسمی Meta اعتبارسنجی
              می‌شوند.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">۸. تماس با ما</h2>
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
            <h2 className="text-xl font-bold text-neutral-900">Privacy Policy (English summary)</h2>
            <p className="mt-3">
              Tavakoli Direct is a private service operated by Tavakoli Studio (Istanbul, Turkey)
              for managing and automating Instagram Direct messages on behalf of businesses that
              have explicitly connected their own Instagram professional accounts. It is not open to
              public signup.
            </p>
            <p className="mt-3">
              We process Instagram-scoped user IDs, usernames, message and comment content, and any
              contact details a user voluntarily sends, solely to deliver automated replies, enable
              human follow-up in a shared inbox, track leads for the account owner, and produce
              usage reports. We use only official Meta/Instagram APIs and never request or store
              Instagram passwords. Access tokens are encrypted at rest (AES-256-GCM); team passwords
              are hashed with Argon2id.
            </p>
            <p className="mt-3">
              We do not sell personal data or share it with third parties for advertising. Raw
              webhook payloads are deleted automatically under a limited retention policy (30 days
              by default). To request access, export, or deletion of your data, see our{' '}
              <Link href="/data-deletion" className="text-brand-dark hover:underline">
                data deletion instructions
              </Link>{' '}
              or email{' '}
              <a href="mailto:tavakolipix@gmail.com" className="text-brand-dark hover:underline">
                tavakolipix@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
