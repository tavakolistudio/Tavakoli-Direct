import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from './cn';

/* ── Card ─────────────────────────────────────────────────────────────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('rounded-xl border border-neutral-200 bg-white shadow-sm', className)}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h3 className={cn('text-base font-semibold text-neutral-900', className)} {...props} />;
}
export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return <p className={cn('text-sm text-neutral-500', className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

/* ── Input / Textarea / Label ─────────────────────────────────────────── */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[90px] w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): React.ReactElement {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-neutral-700', className)} {...props} />
  );
}

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
      className,
    )}
    {...props}
  />
));
Select.displayName = 'Select';

/* ── Badge ────────────────────────────────────────────────────────────── */
const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-neutral-100 text-neutral-700',
      brand: 'bg-brand/10 text-brand-dark',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-amber-100 text-amber-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}
export function Badge({ className, tone, ...props }: BadgeProps): React.ReactElement {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ── Table ────────────────────────────────────────────────────────────── */
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>): React.ReactElement {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-right text-sm', className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return <thead className={cn('border-b border-neutral-200 text-neutral-500', className)} {...props} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): React.ReactElement {
  return <tr className={cn('border-b border-neutral-100 last:border-0', className)} {...props} />;
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <th className={cn('px-3 py-2.5 font-medium', className)} {...props} />;
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <td className={cn('px-3 py-2.5 text-neutral-800', className)} {...props} />;
}
