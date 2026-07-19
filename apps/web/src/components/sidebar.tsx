'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@tavakoli/ui';
import { NAV_ITEMS } from '@/lib/labels';
import { Icon } from './icons';
import { logoutAction } from '@/server/actions/auth';

interface SidebarProps {
  role: 'ADMIN' | 'OPERATOR';
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => !('adminOnly' in i && i.adminOnly) || role === 'ADMIN');

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100"
          aria-label="منو"
        >
          <Icon name="menu" />
        </button>
        <span className="font-bold text-neutral-900">Tavakoli Direct</span>
        <span className="w-9" />
      </div>

      {open ? (
        <button
          type="button"
          aria-label="بستن منو"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-64 transform border-l border-neutral-200 bg-white transition-transform md:static md:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
            <div className="bg-brand flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white">
              TD
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-neutral-900">Tavakoli Direct</div>
              <div className="text-[11px] text-neutral-400">پنل مدیریت دایرکت</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-brand/10 text-brand-dark font-medium'
                      : 'text-neutral-600 hover:bg-neutral-100',
                  )}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-neutral-100 p-3">
            <div className="mb-2 px-2 text-sm text-neutral-700">{userName}</div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                <Icon name="logout" />
                خروج
              </button>
            </form>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
        />
      ) : null}
    </>
  );
}
