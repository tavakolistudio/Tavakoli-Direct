/** Persian display labels for domain enums and navigation. */

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'داشبورد', icon: 'home' },
  { href: '/clients', label: 'مجموعه‌ها', icon: 'briefcase' },
  { href: '/instagram-accounts', label: 'پیج‌های اینستاگرام', icon: 'instagram' },
  { href: '/automations', label: 'اتوماسیون‌ها', icon: 'bolt' },
  { href: '/inbox', label: 'صندوق پیام‌ها', icon: 'inbox' },
  { href: '/contacts', label: 'مخاطبان', icon: 'users' },
  { href: '/reports', label: 'گزارش‌ها', icon: 'chart' },
  { href: '/team', label: 'اعضای تیم', icon: 'team', adminOnly: true },
  { href: '/settings', label: 'تنظیمات', icon: 'settings' },
] as const;

export const TRIGGER_LABELS: Record<string, string> = {
  DM_KEYWORD: 'وقتی کسی در دایرکت کلمه‌ای می‌فرستد',
  COMMENT_KEYWORD: 'وقتی کسی زیر پست کامنت می‌گذارد',
  STORY_REPLY_KEYWORD: 'وقتی کسی به استوری جواب می‌دهد',
  OUTSIDE_BUSINESS_HOURS: 'وقتی خارج از ساعت کاری پیام می‌آید',
  NO_RULE_MATCHED: 'وقتی هیچ قانونی جواب نداد (ارجاع به اپراتور)',
};

/** One-line explanation shown under the trigger picker. */
export const TRIGGER_HINTS: Record<string, string> = {
  DM_KEYWORD: 'پاسخ در همان گفتگوی دایرکت فرستاده می‌شود.',
  COMMENT_KEYWORD:
    'پاسخ به‌صورت دایرکت برای کامنت‌گذار می‌رود. می‌توانید هم‌زمان زیر کامنت هم جواب عمومی بگذارید.',
  STORY_REPLY_KEYWORD: 'ممکن است بسته به تنظیمات Meta در دسترس نباشد.',
  OUTSIDE_BUSINESS_HOURS: 'ساعت کاری در تنظیمات هر مجموعه مشخص می‌شود.',
  NO_RULE_MATCHED: 'گفتگو به کارتابل اپراتور منتقل می‌شود تا انسان جواب دهد.',
};

export const MATCH_MODE_LABELS: Record<string, string> = {
  EXACT: 'تطابق دقیق',
  CONTAINS: 'شامل باشد',
  STARTS_WITH: 'شروع شود با',
  ANY_OF: 'هر یک از کلمات',
};

export const AUTOMATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  ACTIVE: 'فعال',
  PAUSED: 'متوقف',
  ARCHIVED: 'بایگانی',
};

export const CONVERSATION_STATUS_LABELS: Record<string, string> = {
  OPEN: 'باز',
  NEEDS_HUMAN: 'نیازمند پاسخ',
  WAITING_CUSTOMER: 'منتظر مشتری',
  FOLLOW_UP: 'در حال پیگیری',
  RESOLVED: 'بسته شده',
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'جدید',
  NEEDS_FOLLOW_UP: 'نیازمند پیگیری',
  CONTACTED: 'تماس گرفته شد',
  POTENTIAL: 'مشتری احتمالی',
  WON: 'مشتری نهایی',
  LOST: 'ناموفق',
  CLOSED: 'بسته شده',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  CONNECTED: 'متصل',
  DISCONNECTED: 'قطع',
  ERROR: 'خطا',
  PENDING: 'در انتظار',
};

export const TOKEN_STATUS_LABELS: Record<string, string> = {
  VALID: 'معتبر',
  EXPIRING: 'در حال انقضا',
  EXPIRED: 'منقضی',
  MISSING: 'ثبت‌نشده',
};

export const HANDOFF_REASON_LABELS: Record<string, string> = {
  NO_RULE_MATCHED: 'هیچ اتوماسیونی مطابقت نداشت',
  CUSTOMER_REQUESTED_HUMAN: 'درخواست گفتگو با انسان',
  INVALID_PHONE: 'شماره تماس نامعتبر',
  PROVIDER_ERROR: 'خطای اتصال',
  OPERATOR_PAUSED: 'توقف دستی توسط اپراتور',
  SENSITIVE_MESSAGE: 'پیام حساس',
  SCENARIO_COMPLETED: 'اتمام سناریو',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'مدیر',
  OPERATOR: 'اپراتور',
};

export const WEBHOOK_STATUS_LABELS: Record<string, string> = {
  UNKNOWN: 'فعال نشده',
  VERIFIED: 'فعال',
  FAILED: 'ناموفق',
};
