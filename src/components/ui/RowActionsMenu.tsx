import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

export type RowActionItem = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
};

type Props = {
  actions: RowActionItem[];
  triggerLabel?: string;
  className?: string;
};

export default function RowActionsMenu({
  actions,
  triggerLabel = 'More actions',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        aria-label={triggerLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              className={cn(
                'block w-full px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
                action.variant === 'danger'
                  ? 'text-rose-700 hover:bg-rose-50'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
              onClick={() => {
                if (action.disabled) return;
                setOpen(false);
                action.onClick();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
