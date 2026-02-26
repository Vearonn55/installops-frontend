// src/components/CommandPalette.tsx — Inline search bar with Dropbox-style dropdown
import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { HelpCircle, Search } from 'lucide-react';

export interface CommandPaletteRef {
  focus: () => void;
}

export type PaletteItemType = 'page' | 'command' | 'help';

export interface CommandPaletteItem {
  id: string;
  label: string;
  labelKey?: string;
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
  items: CommandPaletteItem[];
  onSelect: (item: CommandPaletteItem) => void;
  placeholder?: string;
  noResultsText?: string;
  className?: string;
}

const CommandPalette = forwardRef<CommandPaletteRef, CommandPaletteProps>(function CommandPalette({
  items,
  onSelect,
  placeholder = 'Search or type a command…',
  noResultsText = 'No results',
  className = '',
}, ref) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsOpen(true);
      inputRef.current?.focus();
    },
  }), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((item) => fuzzyMatch(query, item.label));
  }, [items, query]);

  const showDropdown = isOpen && query.trim().length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown) return;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
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
            setQuery('');
            setIsOpen(false);
            inputRef.current?.blur();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDropdown, onSelect, filtered, selectedIndex]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || filtered.length === 0) return;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex, filtered.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: CommandPaletteItem) => {
    onSelect(item);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className={`relative flex flex-1 max-w-xl ${className}`}>
      <div className="relative flex w-full items-center rounded-lg border border-gray-200 bg-gray-50 focus-within:border-primary-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-primary-500 transition-colors">
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-500 bg-transparent border-0 focus:ring-0 focus:outline-none"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="command-palette-list"
          aria-expanded={showDropdown}
          aria-activedescendant={
            showDropdown && filtered[selectedIndex]
              ? `palette-item-${filtered[selectedIndex].id}`
              : undefined
          }
        />
      </div>

      {showDropdown && (
        <div
          id="command-palette-list"
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="py-4 px-4 text-center text-sm text-gray-500">
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
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelect(item)}
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
      )}
    </div>
  );
});

export default CommandPalette;
