/**
 * AI reply generation. Given a step's knowledge base and an inbound comment,
 * this drafts a short DM reply. Like the messaging provider, it is an interface
 * with two implementations so the product runs (and tests) with no key:
 *   - OpenAiReplyProvider: calls the OpenAI Chat Completions API.
 *   - MockAiReplyProvider: deterministic, offline, used when OPENAI_API_KEY is unset.
 *
 * The reply is content only — actually sending it is the messaging provider's job.
 */
import { env } from '@tavakoli/config';

/**
 * Reply language: 'auto' (default) mirrors the language of the comment, so
 * Persian, Turkish and English customers each get a same-language reply.
 */
export const AI_REPLY_LANGUAGES = ['auto', 'fa', 'tr', 'en'] as const;
export type AiReplyLanguage = (typeof AI_REPLY_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<Exclude<AiReplyLanguage, 'auto'>, string> = {
  fa: 'فارسی (Persian)',
  tr: 'ترکی استانبولی (Turkish)',
  en: 'انگلیسی (English)',
};

export interface AiReplyInput {
  /** The information the operator gave the step (products, prices, FAQ, tone). */
  knowledge: string;
  /** Optional extra persona/style instructions for this step. */
  instructions?: string;
  /** The inbound comment text we are replying to. */
  commentText: string;
  /** The commenter's username, when known, for a more personal reply. */
  contactUsername?: string;
  /** Soft cap on reply length; the model is asked to stay concise. */
  maxWords?: number;
  /** Reply language; 'auto' (default) replies in the comment's own language. */
  language?: AiReplyLanguage;
}

export interface AiReplyResult {
  success: boolean;
  text?: string;
  error?: { message?: string; httpStatus?: number };
}

export interface AiReplyProvider {
  readonly name: 'openai' | 'mock';
  generateReply(input: AiReplyInput): Promise<AiReplyResult>;
}

const DEFAULT_MAX_WORDS = 60;

/** Instruction for the model about which language to reply in. */
function languageDirective(language: AiReplyLanguage | undefined): string {
  if (!language || language === 'auto') {
    return 'به همان زبانی که کامنت کاربر نوشته شده پاسخ بده (مثلاً فارسی، ترکی استانبولی یا انگلیسی).';
  }
  return `پاسخ را حتماً به زبان ${LANGUAGE_NAMES[language]} بنویس، صرف‌نظر از زبان کامنت کاربر.`;
}

/** Build the system prompt from the step's knowledge and instructions. */
function buildSystemPrompt(input: AiReplyInput): string {
  const maxWords = input.maxWords ?? DEFAULT_MAX_WORDS;
  return [
    'شما دستیار پاسخ‌گوی اینستاگرام برای یک کسب‌وکار هستید.',
    'بر اساس «دانش» زیر و فقط با اتکا به آن، یک پاسخ کوتاه و دوستانه به',
    'کامنت کاربر بنویس (این پاسخ ممکن است زیر کامنت یا به‌صورت دایرکت ارسال شود).',
    languageDirective(input.language),
    `پاسخ را کوتاه نگه دار (حداکثر حدود ${maxWords} کلمه) و از ذکر اینکه هوش مصنوعی هستی خودداری کن.`,
    'اگر اطلاعات کافی در دانش نبود، مؤدبانه بگو که همکاران ما به‌زودی پاسخ می‌دهند.',
    input.instructions ? `\nدستورالعمل‌های تکمیلی:\n${input.instructions}` : '',
    `\nدانش:\n${input.knowledge}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildUserPrompt(input: AiReplyInput): string {
  const who = input.contactUsername ? `@${input.contactUsername}` : 'یک کاربر';
  return `${who} این کامنت را گذاشته است:\n«${input.commentText}»\n\nپاسخ دایرکت مناسب را بنویس.`;
}

/** OpenAI Chat Completions implementation. */
export class OpenAiReplyProvider implements AiReplyProvider {
  readonly name = 'openai' as const;

  async generateReply(input: AiReplyInput): Promise<AiReplyResult> {
    try {
      const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL,
          temperature: 0.6,
          max_tokens: 400,
          messages: [
            { role: 'system', content: buildSystemPrompt(input) },
            { role: 'user', content: buildUserPrompt(input) },
          ],
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (!res.ok || json.error) {
        return {
          success: false,
          error: {
            message: json.error?.message ?? 'OpenAI request failed',
            httpStatus: res.status,
          },
        };
      }
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) return { success: false, error: { message: 'empty AI response' } };
      return { success: true, text };
    } catch (err) {
      return { success: false, error: { message: (err as Error).message } };
    }
  }
}

/**
 * Deterministic offline generator used when no OpenAI key is configured. It never
 * calls the network, so the whole product remains runnable and testable. It
 * produces a plausible reply that references the knowledge, so operators can see
 * the flow end-to-end in mock mode.
 */
export class MockAiReplyProvider implements AiReplyProvider {
  readonly name = 'mock' as const;

  async generateReply(input: AiReplyInput): Promise<AiReplyResult> {
    const knowledge = input.knowledge.trim();
    if (!knowledge) return { success: false, error: { message: 'empty knowledge base' } };
    const greeting = input.contactUsername ? `سلام @${input.contactUsername}!` : 'سلام!';
    const firstLine = knowledge.split(/\n+/)[0]?.slice(0, 200) ?? knowledge.slice(0, 200);
    return {
      success: true,
      text: `${greeting} ممنون از پیام‌تان درباره «${input.commentText.slice(0, 60)}». ${firstLine}`,
    };
  }
}

let cached: AiReplyProvider | null = null;

/** Return the configured AI provider (openai when a key exists, else mock). */
export function getAiReplyProvider(): AiReplyProvider {
  if (cached) return cached;
  cached = env.OPENAI_API_KEY ? new OpenAiReplyProvider() : new MockAiReplyProvider();
  return cached;
}

/** For tests: reset the cached AI provider. */
export function resetAiReplyProvider(): void {
  cached = null;
}
