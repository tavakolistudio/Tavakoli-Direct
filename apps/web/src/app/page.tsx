import Link from 'next/link';
import { APP_NAME } from '@tavakoli/config';
import { Icon } from '@/components/icons';

// Public marketing/showcase page (statically rendered, SEO-optimized). The panel
// itself stays private — this only presents the service and points team members
// to the login. No public signup. "Tavakoli Studio" is woven through the copy for
// search visibility.

const WHY = [
  {
    title: 'پیام‌ها گم می‌شوند',
    desc: 'در ساعت‌های شلوغ یا هنگام کمپین، حجم دایرکت بالا می‌رود و بخشی از پیام‌ها دیر پاسخ می‌گیرند یا فراموش می‌شوند.',
  },
  {
    title: 'سرنخ‌ها از دست می‌روند',
    desc: 'مشتری‌ای که قیمت می‌پرسد و پاسخ سریع نمی‌گیرد، معمولاً سراغ رقیب می‌رود؛ یعنی فروش ازدست‌رفته.',
  },
  {
    title: 'سوال‌های تکراری وقت‌گیرند',
    desc: 'پاسخ به «قیمت چنده؟» و «چطور سفارش بدم؟» ده‌ها بار در روز، انرژی و زمان تیم را می‌گیرد.',
  },
  {
    title: 'اطلاعات پراکنده است',
    desc: 'شماره تماس و درخواست مشتریان جایی منظم ثبت نمی‌شود و پیگیری‌ها ناقص می‌ماند.',
  },
];

const HELP = [
  {
    icon: 'bolt',
    title: 'پاسخ آنی، فروش بیشتر',
    desc: 'سرعت پاسخ‌گویی مهم‌ترین عامل تبدیل یک پیام به مشتری است. دایرکت هوشمند توکلی استودیو در همان لحظه به پیام‌های پرتکرار پاسخ می‌دهد تا هیچ فرصت فروشی از دست نرود.',
  },
  {
    icon: 'inbox',
    title: 'حضور ۲۴ ساعته، حتی تعطیل',
    desc: 'کسب‌وکار شما شب و روز و در تعطیلات هم پاسخ‌گو می‌ماند. خارج از ساعت کاری، پیام مناسب برای مشتری ارسال می‌شود تا احساس بی‌توجهی نکند.',
  },
  {
    icon: 'instagram',
    title: 'تبدیل کامنت به مشتری',
    desc: 'وقتی کاربری زیر پست یا ریلز کامنت می‌گذارد، توکلی استودیو به‌صورت رسمی پاسخ را در دایرکت او می‌فرستد و او را یک قدم به خرید نزدیک‌تر می‌کند.',
  },
  {
    icon: 'users',
    title: 'ثبت و پیگیری سرنخ',
    desc: 'هر مخاطب و شماره تماس به‌صورت خودکار ثبت و دسته‌بندی می‌شود. دیگر هیچ سرنخی بین انبوه پیام‌ها گم نمی‌شود و پیگیری منظم می‌شود.',
  },
  {
    icon: 'briefcase',
    title: 'تصویر حرفه‌ای از برند',
    desc: 'پاسخ سریع، منظم و یکدست، اعتماد مخاطب را جلب می‌کند. برند شما در ذهن مشتری، حرفه‌ای و قابل‌اتکا دیده می‌شود.',
  },
  {
    icon: 'chart',
    title: 'تمرکز تیم روی گفتگوهای مهم',
    desc: 'پاسخ‌های تکراری خودکار می‌شوند و تیم شما فقط روی گفتگوهایی که واقعاً به تصمیم انسانی نیاز دارند تمرکز می‌کند.',
  },
];

const SERVICES = [
  {
    icon: 'inbox',
    title: 'پاسخ خودکار دایرکت',
    desc: 'پاسخ فوری و هوشمند به پیام‌های دایرکت بر اساس کلمات کلیدی فارسی، حتی خارج از ساعت کاری.',
  },
  {
    icon: 'instagram',
    title: 'پاسخ خصوصی به کامنت',
    desc: 'وقتی کاربر زیر پست کامنت می‌گذارد، به‌صورت رسمی پاسخ را در دایرکت او می‌فرستیم.',
  },
  {
    icon: 'bolt',
    title: 'سناریوهای گفتگو',
    desc: 'گفتگوهای چندمرحله‌ای ساده برای معرفی خدمات و راهنمایی مشتری تا مرحلهٔ نهایی خرید.',
  },
  {
    icon: 'users',
    title: 'جمع‌آوری سرنخ',
    desc: 'ثبت خودکار مخاطبان و شماره تماس، همراه با وضعیت پیگیری هر سرنخ.',
  },
  {
    icon: 'briefcase',
    title: 'صندوق پیام مشترک',
    desc: 'همهٔ گفتگوها در یک صندوق مشترک تیمی؛ واگذاری، یادداشت داخلی و پیگیری منظم.',
  },
  {
    icon: 'chart',
    title: 'گزارش‌های قابل‌اعتماد',
    desc: 'آمار دقیق پیام‌ها، پاسخ‌ها و سرنخ‌ها بر پایهٔ رویدادهای واقعی، بدون عدد ساختگی.',
  },
];

const USE_CASES = [
  {
    title: 'فروشگاه‌های اینستاگرامی',
    desc: 'پاسخ سریع به «قیمت؟» و «موجوده؟» و هدایت مشتری تا ثبت سفارش.',
  },
  {
    title: 'استودیوهای عکاسی و خدمات خلاق',
    desc: 'ارسال تعرفه، معرفی پکیج‌ها و رزرو نوبت — تجربه‌ای که توکلی استودیو خود با آن آشناست.',
  },
  {
    title: 'کلینیک‌ها و خدمات زیبایی',
    desc: 'پاسخ به سوال‌های پرتکرار، معرفی خدمات و گرفتن شماره برای هماهنگی نوبت.',
  },
  {
    title: 'آموزشگاه‌ها و دوره‌ها',
    desc: 'معرفی دوره‌ها، ارسال سرفصل‌ها و جمع‌آوری علاقه‌مندان ثبت‌نام.',
  },
  {
    title: 'املاک و خدمات مشاوره',
    desc: 'دریافت درخواست، دسته‌بندی سرنخ‌ها و ارجاع سریع به مشاور مناسب.',
  },
  {
    title: 'رستوران‌ها و کافه‌ها',
    desc: 'پاسخ به ساعت کاری، منو و رزرو، بدون از دست دادن هیچ پیامی.',
  },
];

const STEPS = [
  {
    n: '۱',
    title: 'اتصال پیج',
    desc: 'پیج اینستاگرام مجموعه از طریق روش رسمی متا به توکلی استودیو متصل می‌شود.',
  },
  {
    n: '۲',
    title: 'تعریف اتوماسیون',
    desc: 'در چند گام ساده، پاسخ‌های خودکار، کلمات کلیدی و سناریوهای گفتگو ساخته می‌شوند.',
  },
  {
    n: '۳',
    title: 'پاسخ‌گویی هوشمند',
    desc: 'از این پس پیام‌ها خودکار پاسخ می‌گیرند، سرنخ‌ها ثبت و گفتگوهای مهم به تیم ارجاع می‌شوند.',
  },
];

const FAQ = [
  {
    q: 'دایرکت هوشمند توکلی استودیو دقیقاً چه کاری انجام می‌دهد؟',
    a: 'به پیام‌های دایرکت و کامنت‌های اینستاگرام به‌صورت خودکار و بر اساس کلمات کلیدی پاسخ می‌دهد، سرنخ‌ها را ثبت می‌کند و گفتگوهای مهم را برای پاسخ انسانی به تیم ارجاع می‌دهد.',
  },
  {
    q: 'این سرویس برای چه کسانی است؟',
    a: 'این خدمات به‌صورت اختصاصی برای اعضای باشگاه مشتریان توکلی استودیو ارائه می‌شود و ثبت‌نام عمومی ندارد.',
  },
  {
    q: 'آیا از اینستاگرام رسمی استفاده می‌شود؟',
    a: 'بله. تمام قابلیت‌ها بر پایهٔ APIها و وبهوک‌های رسمی متا طراحی شده‌اند. هیچ‌گاه رمز اینستاگرام شما درخواست نمی‌شود و از روش‌های غیررسمی استفاده نمی‌کنیم.',
  },
  {
    q: 'پاسخ‌های خودکار چطور کلمات فارسی را تشخیص می‌دهند؟',
    a: 'متن پیام‌ها با در نظر گرفتن تفاوت حروف (مثل ی و ي، ک و ك)، اعداد فارسی و انگلیسی و نیم‌فاصله نرمال‌سازی می‌شود تا تطبیق کلمات کلیدی دقیق باشد.',
  },
  {
    q: 'اگر گفتگویی به پاسخ انسانی نیاز داشته باشد چه می‌شود؟',
    a: 'به‌صورت خودکار به اپراتور ارجاع داده می‌شود و در صندوق پیام مشترک تیمی قابل پیگیری است؛ یعنی هوش مصنوعی جای انسان را نمی‌گیرد، بلکه کنارش کار می‌کند.',
  },
  {
    q: 'آیا امکان پاسخ دستی هم وجود دارد؟',
    a: 'بله. اپراتورهای توکلی استودیو می‌توانند هر زمان اتوماسیون یک گفتگو را متوقف کرده و به‌صورت دستی پاسخ دهند.',
  },
  {
    q: 'آیا این کار باعث اسپم یا محدودیت پیج می‌شود؟',
    a: 'خیر. چون همه‌چیز بر پایهٔ ابزارهای رسمی متا و در چارچوب قوانین آن انجام می‌شود و پیام انبوه ناخواسته ارسال نمی‌شود.',
  },
  {
    q: 'راه‌اندازی چقدر طول می‌کشد؟',
    a: 'پس از اتصال پیج، ساخت اولین اتوماسیون تنها چند دقیقه زمان می‌برد و بلافاصله فعال می‌شود.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Tavakoli Studio',
      alternateName: 'توکلی استودیو',
      url: 'https://tavakoli-direct.vercel.app',
      description:
        'توکلی استودیو ارائه‌دهندهٔ خدمات هوشمند دایرکت اینستاگرام ویژهٔ باشگاه مشتریان خود است.',
    },
    {
      '@type': 'WebSite',
      name: APP_NAME,
      url: 'https://tavakoli-direct.vercel.app',
      inLanguage: 'fa-IR',
    },
    {
      '@type': 'Service',
      name: 'دایرکت هوشمند توکلی استودیو',
      serviceType: 'اتوماسیون دایرکت و پاسخ خودکار اینستاگرام',
      areaServed: 'IR',
      provider: { '@type': 'Organization', name: 'Tavakoli Studio' },
      description:
        'پاسخ خودکار دایرکت، پاسخ خصوصی به کامنت، سناریوهای گفتگو، جمع‌آوری سرنخ و صندوق پیام مشترک، ویژهٔ باشگاه مشتریان توکلی استودیو.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-neutral-600">{subtitle}</p> : null}
    </div>
  );
}

export default function LandingPage(): React.ReactElement {
  return (
    <div className="bg-canvas min-h-screen text-neutral-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-brand flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white">
              TD
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">دایرکت هوشمند توکلی</div>
              <div className="text-[11px] text-neutral-400">Tavakoli Studio</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
            <a href="#why" className="hover:text-neutral-900">
              چرا دایرکت هوشمند؟
            </a>
            <a href="#services" className="hover:text-neutral-900">
              خدمات
            </a>
            <a href="#usecases" className="hover:text-neutral-900">
              کاربردها
            </a>
            <a href="#faq" className="hover:text-neutral-900">
              سوالات
            </a>
          </nav>
          <Link
            href="/login"
            className="bg-brand hover:bg-brand-dark rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            ورود اعضا
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-brand/10 pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24">
          <div>
            <span className="border-brand/20 bg-brand/5 text-brand-dark inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              ویژهٔ باشگاه مشتریان توکلی استودیو
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight text-neutral-900 md:text-5xl">
              دایرکت اینستاگرام‌تان، <span className="text-brand">هوشمند</span> پاسخ می‌دهد
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-neutral-600 md:text-lg">
              دایرکت هوشمند توکلی استودیو پاسخ خودکار به پیام‌ها و کامنت‌ها، ساخت سناریوهای گفتگو،
              جمع‌آوری سرنخ و مدیریت گفتگوها را در یک صندوق مشترک تیمی و بر پایهٔ ابزارهای رسمی
              اینستاگرام فراهم می‌کند.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="bg-brand hover:bg-brand-dark rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                ورود اعضای تیم
              </Link>
              <a
                href="#why"
                className="rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
              >
                چرا دایرکت هوشمند؟
              </a>
            </div>
            <p className="mt-4 text-xs text-neutral-400">
              بدون ثبت‌نام عمومی — دسترسی فقط برای مجموعه‌های عضو باشگاه مشتریان توکلی استودیو.
            </p>
          </div>

          {/* Chat mockup */}
          <div className="relative">
            <div className="mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center gap-2 border-b border-neutral-100 pb-3">
                <div className="from-brand to-brand-light h-8 w-8 rounded-full bg-gradient-to-tr" />
                <div className="text-sm font-semibold">tavakoli.studio</div>
                <span className="mr-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">
                  آنلاین
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-neutral-100 px-3 py-2">
                    سلام، قیمت خدمات عکاسی چقدره؟
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="border-brand/30 bg-brand/5 max-w-[85%] rounded-2xl border px-3 py-2">
                    سلام 🌹 برای دریافت تعرفه، لطفاً نوع خدمت موردنظرتان را انتخاب کنید.
                    <div className="mt-1 text-[10px] text-neutral-400">پاسخ خودکار · آنی</div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {['عکاسی عروسی', 'تبلیغاتی', 'مدیریت پیج'].map((o) => (
                    <span
                      key={o}
                      className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:px-8">
          {[
            ['پاسخ آنی', 'به دایرکت و کامنت'],
            ['۲۴/۷', 'حتی خارج ساعت کاری'],
            ['سرنخ‌ها', 'خودکار ثبت می‌شوند'],
            ['رسمی', 'مبتنی بر API متا'],
          ].map(([t, d]) => (
            <div key={t} className="text-center">
              <div className="text-brand-dark text-xl font-bold">{t}</div>
              <div className="mt-1 text-xs text-neutral-500">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          title="چرا دایرکت هوشمند؟"
          subtitle="مدیریت دستی دایرکت اینستاگرام در کسب‌وکارهای فعال، چالش‌های جدی دارد."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3 className="font-semibold text-neutral-900">{w.title}</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-600">{w.desc}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-center leading-8 text-neutral-600">
          دایرکت هوشمند توکلی استودیو دقیقاً برای حل همین چالش‌ها ساخته شده است: پاسخ سریع و یکدست،
          ثبت منظم سرنخ‌ها و تمرکز تیم روی گفتگوهایی که واقعاً اهمیت دارند.
        </p>
      </section>

      {/* How it helps business (SEO content) */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <SectionHeading
            title="دایرکت هوشمند چطور به رشد کسب‌وکار کمک می‌کند؟"
            subtitle="پاسخ‌گویی سریع و منظم در اینستاگرام، مستقیماً روی فروش و رضایت مشتری اثر می‌گذارد."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HELP.map((h) => (
              <div key={h.title} className="bg-canvas rounded-2xl border border-neutral-200 p-6">
                <div className="bg-brand/10 text-brand-dark flex h-11 w-11 items-center justify-center rounded-xl">
                  <Icon name={h.icon} />
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900">{h.title}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-600">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          title="خدمات دایرکت هوشمند توکلی استودیو"
          subtitle="هر آنچه برای پاسخ‌گویی سریع و منظم به مشتریان اینستاگرام لازم است."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="bg-brand/10 text-brand-dark flex h-11 w-11 items-center justify-center rounded-xl">
                <Icon name={s.icon} />
              </div>
              <h3 className="mt-4 font-semibold text-neutral-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-7 text-neutral-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section id="usecases" className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <SectionHeading
            title="مناسب چه کسب‌وکارهایی است؟"
            subtitle="هر مجموعه‌ای که مشتریانش از راه دایرکت اینستاگرام با او در ارتباط‌اند."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="bg-canvas rounded-2xl border border-neutral-200 p-6">
                <h3 className="text-brand-dark font-semibold">{u.title}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-600">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Tavakoli Studio (trust + SEO) */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading title="چرا توکلی استودیو؟" />
        <div className="mt-8 space-y-5 text-center leading-8 text-neutral-700">
          <p>
            توکلی استودیو سال‌هاست در مدیریت پیج‌های اینستاگرام و خدمات دیجیتال فعالیت می‌کند و
            چالش‌های پاسخ‌گویی به مشتری را از نزدیک می‌شناسد. دایرکت هوشمند توکلی استودیو حاصل همین
            تجربه است: ابزاری فارسی، ساده و حرفه‌ای برای پاسخ‌گویی به مشتریان اینستاگرام.
          </p>
          <p>
            تمرکز ما بر پاسخ‌گویی سریع، حفظ تصویر حرفه‌ای برند و استفادهٔ کامل از ابزارهای رسمی متا
            است؛ بدون روش‌های غیررسمی و بدون درخواست رمز اینستاگرام. امنیت داده‌ها و اعتماد مشتریان،
            اصل کار توکلی استودیو است.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <SectionHeading
            title="چطور کار می‌کند؟"
            subtitle="در سه گام ساده، پاسخ‌گویی خودکار فعال می‌شود."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-neutral-200 p-6 text-center">
                <div className="bg-brand mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-4xl px-4 py-16 md:px-8">
        <SectionHeading
          title="امنیت و اصولی بودن"
          subtitle="همه‌چیز بر پایهٔ ابزارهای رسمی و با احترام به قوانین اینستاگرام."
        />
        <div className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
          {[
            ['API رسمی متا', 'هیچ روش غیررسمی یا اسکرپینگی استفاده نمی‌شود.'],
            ['بدون رمز اینستاگرام', 'هیچ‌گاه رمز پیج شما درخواست نمی‌شود.'],
            ['حفاظت از داده‌ها', 'اطلاعات مخاطبان با دقت و امن نگه‌داری می‌شود.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white p-5 text-center">
              <div className="font-semibold text-neutral-900">{t}</div>
              <p className="mt-2 leading-7 text-neutral-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Customer club callout */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="from-brand/5 border-brand/20 rounded-3xl border bg-gradient-to-l to-transparent p-8 text-center md:p-12">
          <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
            ویژهٔ باشگاه مشتریان توکلی استودیو
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-neutral-700">
            این خدمات مربوط به باشگاه مشتریان توکلی استودیو می‌باشد و به‌صورت اختصاصی برای
            مجموعه‌های همکار ارائه می‌شود. ثبت‌نام عمومی وجود ندارد.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="bg-brand hover:bg-brand-dark rounded-xl px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              ورود اعضا
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-center text-2xl font-bold md:text-3xl">سوال‌های پرتکرار</h2>
          <div className="mt-10 space-y-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="bg-canvas group rounded-2xl border border-neutral-200 p-5 open:bg-white"
              >
                <summary className="cursor-pointer list-none font-semibold text-neutral-900">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-7 text-neutral-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-500 md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-brand flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white">
              TD
            </div>
            <span>دایرکت هوشمند توکلی — Tavakoli Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#services" className="hover:text-neutral-800">
              خدمات
            </a>
            <a href="#usecases" className="hover:text-neutral-800">
              کاربردها
            </a>
            <a href="#faq" className="hover:text-neutral-800">
              سوالات
            </a>
            <Link href="/login" className="hover:text-neutral-800">
              ورود اعضا
            </Link>
          </div>
        </div>
        <div className="border-t border-neutral-100 py-4 text-center text-xs text-neutral-400">
          این خدمات مربوط به باشگاه مشتریان توکلی استودیو می‌باشد.
        </div>
      </footer>
    </div>
  );
}
