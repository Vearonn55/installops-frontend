// src/components/CommandPalette.tsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Search } from 'lucide-react';

export type PaletteItemType = 'page' | 'command' | 'help';

export interface CommandPaletteItem {
  id: string;
  label: string;
  labelKey?: string; // i18n key, resolved to label by parent
  href?: string;
  type: PaletteItemType;
  icon?: React.ComponentType<{ className?: string }>;
  roles?: string[];
  action?: () => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  let i = 0;
  for (let j = 0; j < t.length && i < q.length; j++) {
    if (t[j] === q[i]) i++;
  }
  return i === q.length;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
  onSelect: (item: CommandPaletteItem) => void;
  placeholder?: string;
  noResultsText?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  items,
  onSelect,
  placeholder = 'Search or type a command…',
  noResultsText = 'No results',
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((item) => fuzzyMatch(query, item.label));
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) =>
            i <= 0 ? Math.max(0, filtered.length - 1) : i - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            onSelect(filtered[selectedIndex]);
            onClose();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelect, filtered, selectedIndex]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || filtered.length === 0) return;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex, filtered.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-gray-200 px-3">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 py-3 px-3 text-gray-900 placeholder-gray-500 border-0 focus:ring-0 focus:outline-none"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filtered[selectedIndex]
                ? `palette-item-${filtered[selectedIndex].id}`
                : undefined
            }
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-gray-200 bg-gray-50 px-1.5 text-xs text-gray-500">
            ESC
          </kbd>
        </div>

        <div
          id="command-palette-list"
          ref={listRef}
          className="max-h-[min(60vh,400px)] overflow-y-auto py-2"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="py-6 px-4 text-center text-sm text-gray-500">
              {noResultsText}
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  id={`palette-item-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  {Icon ? (
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 ${
                        isSelected ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    />
                  ) : (
                    <span className="w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.type === 'help' && (
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↑</kbd>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 ml-0.5">↓</kbd>
            {' '}navigate
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↵</kbd>
            {' '}select
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">esc</kbd>
            {' '}close
          </span>
        </div>
      </div>
    </div>
  );
}

