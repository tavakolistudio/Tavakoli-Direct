import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findClient: vi.fn(),
  updateClient: vi.fn(),
  updateAccounts: vi.fn(),
  updateAutomations: vi.fn(),
  transaction: vi.fn(),
  audit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@tavakoli/database', () => ({
  prisma: {
    client: {
      findFirst: mocks.findClient,
      update: mocks.updateClient,
    },
    instagramAccount: { updateMany: mocks.updateAccounts },
    automation: { updateMany: mocks.updateAutomations },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/lib/guards', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/audit', () => ({ audit: mocks.audit }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { deleteClientAction } from './clients';

describe('deleteClientAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mocks.updateClient.mockResolvedValue({});
    mocks.updateAccounts.mockResolvedValue({ count: 1 });
    mocks.updateAutomations.mockResolvedValue({ count: 2 });
    mocks.transaction.mockResolvedValue([]);
    mocks.audit.mockResolvedValue(undefined);
  });

  it('soft-deletes the client and disables related automation safely', async () => {
    mocks.findClient.mockResolvedValue({ id: 'client-1' });

    await expect(deleteClientAction('client-1')).resolves.toEqual({ ok: true });

    expect(mocks.updateClient).toHaveBeenCalledWith({
      where: { id: 'client-1' },
      data: { isActive: false, deletedAt: expect.any(Date) },
    });
    expect(mocks.updateAccounts).toHaveBeenCalledWith({
      where: { clientId: 'client-1', deletedAt: null },
      data: { automationEnabled: false },
    });
    expect(mocks.updateAutomations).toHaveBeenCalledWith({
      where: { clientId: 'client-1', deletedAt: null },
      data: { status: 'PAUSED' },
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CLIENT_DELETE', entityId: 'client-1' }),
    );
  });

  it('does not mutate data when the client is already absent', async () => {
    mocks.findClient.mockResolvedValue(null);

    await expect(deleteClientAction('missing')).resolves.toEqual({
      ok: false,
      error: 'مجموعه یافت نشد یا قبلاً حذف شده است.',
    });

    expect(mocks.updateClient).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
