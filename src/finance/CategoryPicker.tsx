import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { normalize, ordered } from './catalog';
import type { TxType } from '../lib/types';
import { useFinance } from './store';
export function CategoryPicker({
  value,
  onChange,
  type,
  label = 'Category',
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  type: TxType;
  label?: string;
  exclude?: string;
}) {
  const { w, createCategory } = useFinance(),
    id = useId(),
    input = useRef<HTMLInputElement>(null),
    wrapper = useRef<HTMLDivElement>(null);
  const selected = w.categories.find((c) => c.id === value && c.type === type && c.id !== exclude);
  const [query, setQuery] = useState(selected?.label ?? ''),
    [open, setOpen] = useState(false),
    [filter, setFilter] = useState(false),
    [active, setActive] = useState(0),
    [error, setError] = useState('');
  const previousType = useRef(type);
  const term = filter ? normalize(query) : '';
  const matches = ordered(w.categories).filter(
    (c) => c.id !== exclude && c.type === type && normalize(c.label).includes(term),
  );
  const add =
    !!term &&
    !w.categories.some((c) => c.type === type && normalize(c.label) === term) &&
    w.categories.length < 200;
  const count = matches.length + Number(add),
    index = Math.min(active, Math.max(0, count - 1));
  useEffect(() => {
    if (previousType.current !== type) {
      setQuery(selected?.label ?? '');
      setOpen(false);
      setFilter(false);
    } else if (selected) setQuery(selected.label);
    previousType.current = type;
  }, [type, value, selected?.label]);
  useEffect(
    () => input.current?.setCustomValidity(selected ? '' : 'Choose a category or select Add to create it.'),
    [selected],
  );
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-o-${index}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, index, id]);
  const choose = (i: number) => {
    try {
      const found = matches[i];
      if (!found && !(add && i === matches.length)) return;
      const next = found?.id ?? createCategory(query, type);
      onChange(next);
      setQuery(found?.label ?? query.trim());
      setOpen(false);
      setFilter(false);
      setError('');
      input.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add category.');
    }
  };
  return (
    <div className="category-field" ref={wrapper}>
      <label htmlFor={id}>{label}</label>
      <div className="category-input">
        <Search size={16} />
        <input
          ref={input}
          id={id}
          role="combobox"
          value={query}
          required
          maxLength={60}
          autoComplete="off"
          placeholder="Search or add category"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && count ? `${id}-o-${index}` : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange('');
            setOpen(true);
            setFilter(true);
            setActive(0);
          }}
          onClick={() => {
            if (!open) setFilter(!selected && !!query);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (!open) {
                setOpen(true);
                setFilter(!selected && !!query);
                setActive(0);
              } else
                setActive(
                  (v) => (v + (e.key === 'ArrowDown' ? 1 : -1) + Math.max(1, count)) % Math.max(1, count),
                );
            } else if (e.key === 'Enter' && open) {
              e.preventDefault();
              choose(index);
            } else if (e.key === 'Escape' && open) {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            } else if (e.key === 'Tab') setOpen(false);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show categories"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setOpen(!open);
            setFilter(!selected && !!query);
            input.current?.focus();
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>
      <input type="hidden" name="category" value={selected?.id ?? ''} />
      <div
        className="category-options"
        id={`${id}-list`}
        role="listbox"
        aria-label={`${type} categories`}
        hidden={!open}
      >
        {matches.map((c, i) => (
          <div
            role="option"
            id={`${id}-o-${i}`}
            key={c.id}
            aria-selected={index === i}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(i)}
          >
            {c.label}
            {c.pinned && <small>Pinned</small>}
          </div>
        ))}
        {add && (
          <div
            role="option"
            id={`${id}-o-${matches.length}`}
            aria-selected={index === matches.length}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(matches.length)}
          >
            <Plus size={16} />
            Add “{query.trim()}”
          </div>
        )}
        {!count && <p>No matches. Type a new name to create a category.</p>}
      </div>
      <small id={`${id}-hint`}>Search existing categories or choose Add to create one.</small>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
