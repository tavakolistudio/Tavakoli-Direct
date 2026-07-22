import type { AutomationDef, KeywordMatchMode, TriggerType } from '@tavakoli/core';
import type { Automation, AutomationTrigger } from '@tavakoli/database';

type WithTrigger = Automation & { trigger: AutomationTrigger | null };

/** Map a DB automation (+trigger) to the pure-core AutomationDef. */
export function toAutomationDef(
  a: WithTrigger,
  opts: { storyReplyAvailable: boolean },
): AutomationDef {
  const t = a.trigger;
  return {
    automationId: a.id,
    name: a.name,
    isActive: a.status === 'ACTIVE',
    priority: a.priority,
    createdAt: a.createdAt,
    cooldownSeconds: a.cooldownSeconds,
    maxExecutionsPerContact: a.maxExecutionsPerContact,
    trigger: {
      triggerType: (t?.type ?? 'NO_RULE_MATCHED') as TriggerType,
      keywordRule: t?.matchMode
        ? { mode: t.matchMode as KeywordMatchMode, keywords: t.keywords }
        : undefined,
      mediaId: t?.mediaId ?? null,
      matchAnyComment: t?.matchAnyComment ?? false,
      capabilityAvailable: t?.type === 'STORY_REPLY_KEYWORD' ? opts.storyReplyAvailable : true,
    },
  };
}
