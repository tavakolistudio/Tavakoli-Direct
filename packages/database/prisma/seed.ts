/**
 * Development seed. Creates an admin + operator, one demo client (Tavakoli
 * Studio) with a mock Instagram account, contacts, conversations, messages,
 * tags, leads, and sample automations.
 *
 * Demo businesses are seed-only and never hardcoded in application logic.
 * Sample credentials work only in development and are documented in the README.
 */
import { hash } from '@node-rs/argon2';
import { defaultBusinessHours } from '@tavakoli/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production.');
  }

  // ── Users ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tavakoli.local' },
    update: {},
    create: {
      email: 'admin@tavakoli.local',
      name: 'مدیر سیستم',
      role: 'ADMIN',
      passwordHash: await hash('Admin!12345', ARGON),
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@tavakoli.local' },
    update: {},
    create: {
      email: 'operator@tavakoli.local',
      name: 'اپراتور نمونه',
      role: 'OPERATOR',
      passwordHash: await hash('Operator!12345', ARGON),
    },
  });

  // ── Client (demo, seed-only) ───────────────────────────────────────────
  const client = await prisma.client.upsert({
    where: { slug: 'tavakoli-studio' },
    update: {},
    create: {
      name: 'Tavakoli Studio',
      slug: 'tavakoli-studio',
      description: 'استودیو عکاسی و خدمات دیجیتال',
      phone: '02100000000',
      whatsapp: '09120000000',
      website: 'https://tavakoli.studio',
      timeZone: 'Asia/Tehran',
      businessHours: defaultBusinessHours('Asia/Tehran') as object,
      services: [
        'عکاسی عروسی',
        'عکاسی تبلیغاتی',
        'مدیریت اینستاگرام',
        'طراحی سایت',
        'خدمات هوش مصنوعی',
      ],
      faqs: [{ q: 'ساعات کاری؟', a: 'شنبه تا چهارشنبه ۹ تا ۱۸' }],
      isActive: true,
    },
  });

  await prisma.clientUserAccess.upsert({
    where: { clientId_userId: { clientId: client.id, userId: operator.id } },
    update: {},
    create: { clientId: client.id, userId: operator.id },
  });

  // ── Mock Instagram account ─────────────────────────────────────────────
  const account = await prisma.instagramAccount.upsert({
    where: { providerAccountId: 'mock-tavakoli-studio' },
    update: {},
    create: {
      clientId: client.id,
      providerAccountId: 'mock-tavakoli-studio',
      username: 'tavakoli.studio',
      status: 'CONNECTED',
      tokenStatus: 'VALID',
      webhookStatus: 'VERIFIED',
      provider: 'mock',
      lastWebhookAt: new Date(),
      lastSyncedAt: new Date(),
    },
  });

  await prisma.providerCapability.upsert({
    where: { accountId_key: { accountId: account.id, key: 'STORY_REPLY' } },
    update: { available: false },
    create: {
      accountId: account.id,
      key: 'STORY_REPLY',
      available: false,
      detail: 'Not enabled in mock',
    },
  });
  await prisma.providerCapability.upsert({
    where: { accountId_key: { accountId: account.id, key: 'QUICK_REPLIES' } },
    update: { available: true },
    create: { accountId: account.id, key: 'QUICK_REPLIES', available: true },
  });

  // ── Tags ───────────────────────────────────────────────────────────────
  const tagPrice = await prisma.tag.upsert({
    where: { clientId_name: { clientId: client.id, name: 'علاقه‌مند به قیمت' } },
    update: {},
    create: { clientId: client.id, name: 'علاقه‌مند به قیمت', color: '#b91c1c' },
  });

  // ── Sample automations ─────────────────────────────────────────────────
  // 1) Price keyword → text response
  const priceAutomation = await prisma.automation.create({
    data: {
      clientId: client.id,
      instagramAccountId: account.id,
      name: 'پاسخ به کلمه قیمت',
      status: 'ACTIVE',
      priority: 10,
      cooldownSeconds: 0,
      trigger: {
        create: { type: 'DM_KEYWORD', matchMode: 'CONTAINS', keywords: ['قیمت', 'هزینه', 'تعرفه'] },
      },
      steps: {
        create: [
          {
            order: 0,
            actionType: 'SEND_TEXT',
            config: {
              text: 'سلام، برای دریافت تعرفه لطفاً نوع خدمت موردنظرتان را انتخاب کنید.',
            },
          },
          { order: 1, actionType: 'ADD_TAG', config: { tagId: tagPrice.id } },
        ],
      },
    },
  });

  // 2) Comment keyword → private reply
  await prisma.automation.create({
    data: {
      clientId: client.id,
      instagramAccountId: account.id,
      name: 'کامنت به دایرکت',
      status: 'ACTIVE',
      priority: 5,
      cooldownSeconds: 86400,
      trigger: {
        create: {
          type: 'COMMENT_KEYWORD',
          matchMode: 'CONTAINS',
          keywords: ['قیمت'],
          publicReply: 'پاسخ شما را دایرکت ارسال کردیم 🌹',
        },
      },
      steps: {
        create: [
          {
            order: 0,
            actionType: 'SEND_TEXT',
            config: {
              text: 'سلام، درخواست شما دریافت شد. برای دریافت اطلاعات، نوع خدمت موردنظرتان را انتخاب کنید.',
            },
          },
        ],
      },
    },
  });

  // 3) Outside business hours
  await prisma.automation.create({
    data: {
      clientId: client.id,
      instagramAccountId: account.id,
      name: 'خارج از ساعت کاری',
      status: 'ACTIVE',
      priority: 1,
      cooldownSeconds: 21600,
      trigger: { create: { type: 'OUTSIDE_BUSINESS_HOURS', keywords: [] } },
      steps: {
        create: [
          {
            order: 0,
            actionType: 'SEND_TEXT',
            config: {
              text: 'پیام شما دریافت شد. همکاران Tavakoli Studio در اولین ساعت کاری پاسخ خواهند داد.',
            },
          },
        ],
      },
    },
  });

  // ── Contacts + conversations + messages ─────────────────────────────────
  const contacts = [
    { scoped: 'u-1001', username: 'ali_photo', name: 'علی', lead: 'NEW' as const },
    { scoped: 'u-1002', username: 'sara.events', name: 'سارا', lead: 'NEEDS_FOLLOW_UP' as const },
    { scoped: 'u-1003', username: 'reza.dev', name: 'رضا', lead: 'CONTACTED' as const },
  ];

  for (const [i, c] of contacts.entries()) {
    const contact = await prisma.contact.upsert({
      where: {
        instagramAccountId_scopedUserId: { instagramAccountId: account.id, scopedUserId: c.scoped },
      },
      update: {},
      create: {
        clientId: client.id,
        instagramAccountId: account.id,
        scopedUserId: c.scoped,
        username: c.username,
        displayName: c.name,
        sourceAutomationId: priceAutomation.id,
        lead: { create: { status: c.lead, assignedUserId: i === 0 ? operator.id : null } },
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        clientId: client.id,
        instagramAccountId: account.id,
        contactId: contact.id,
        status: i === 1 ? 'NEEDS_HUMAN' : 'OPEN',
        needsHuman: i === 1,
        handoffReason: i === 1 ? 'NO_RULE_MATCHED' : null,
        lastInboundAt: new Date(),
        messages: {
          create: [
            {
              direction: 'INBOUND',
              type: 'TEXT',
              senderType: 'CONTACT',
              body: 'سلام، قیمت خدمات عکاسی چقدره؟',
              deliveryStatus: 'DELIVERED',
              providerMessageId: `mock-in-${c.scoped}`,
              providerTimestamp: new Date(),
            },
            {
              direction: 'OUTBOUND',
              type: 'TEXT',
              senderType: 'AUTOMATION',
              body: 'سلام، برای دریافت تعرفه لطفاً نوع خدمت موردنظرتان را انتخاب کنید.',
              deliveryStatus: 'SENT',
              automationId: priceAutomation.id,
              providerMessageId: `mock-out-${c.scoped}`,
            },
          ],
        },
      },
    });

    if (i === 1) {
      await prisma.internalNote.create({
        data: {
          conversationId: conversation.id,
          authorId: operator.id,
          body: 'نیاز به پیگیری تلفنی دارد.',
        },
      });
    }
  }

  await prisma.appSetting.upsert({
    where: { key: 'platform' },
    update: {},
    create: {
      key: 'platform',
      value: { name: 'Tavakoli Direct', defaultTimeZone: 'Asia/Tehran' },
    },
  });

  console.info('Seed complete: admin@tavakoli.local / operator@tavakoli.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
