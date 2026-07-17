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
  DM_KEYWORD: 'کلمه کلیدی در دایرکت',
  COMMENT_KEYWORD: 'کلمه کلیدی در کامنت',
  STORY_REPLY_KEYWORD: 'پاسخ به استوری',
  OUTSIDE_BUSINESS_HOURS: 'خارج از ساعت کاری',
  NO_RULE_MATCHED: 'ارجاع به انسان (پیش‌فرض)',
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
