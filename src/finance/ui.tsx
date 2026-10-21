import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Car,
  GraduationCap,
  Heart,
  House,
  Inbox,
  Landmark,
  Laptop,
  Plane,
  Sprout,
  X,
} from 'lucide-react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useTheme } from '../hooks/useTheme';
import { useFinance } from './store';
import type { CategoryId } from '../lib/types';

export function Panel({
  title,
  sub,
  action,
  children,
  className = '',
}: {
  title?: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`sw-panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="sw-empty">
      <span>
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function CategoryIcon({ id, size = 18 }: { id: CategoryId; size?: number }) {
  const { CATEGORIES }=useFinance();
  const c=CATEGORIES[id];
  const { isDark, style } = useTheme();
  const contrastColors: Partial<Record<CategoryId, string>> = {
    utilities: '#8c6900',
    groceries: '#237744',
    salary: '#167048',
    health: '#14766e',
    dining: '#aa4e0f',
    transport: '#08769b',
    refunds: '#916219',
    investments: '#7450c4',
  };
  const color =
    style === 'minimal'
      ? 'var(--text)'
      : style === 'neon'
        ? 'var(--green)'
        : isDark
          ? `color-mix(in srgb, ${c.color} 65%, white)`
          : (contrastColors[id] ?? c.color);
  const Icon = c.icon;
  return (
    <span
      className="category-icon"
      style={{
        background:
          style === 'minimal'
            ? 'var(--surface-alt)'
            : style === 'neon'
              ? 'var(--green-light)'
              : `${c.color}16`,
        color,
      }}
    >
      <Icon size={size} />
    </span>
  );
}
export function Progress({ value, color = 'var(--green)' }: { value: number; color?: string }) {
  return (
    <div
      className="sw-progress"
      role="progressbar"
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progress"
    >
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}
let modalDepth = 0;
let previousOverflow = '';
export function Modal({
  title,
  sub,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    if (modalDepth++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      d.close();
      if (--modalDepth === 0) document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sw-modal ${wide ? 'wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Confirm({
  title,
  text,
  action,
  onClose,
  onConfirm,
}: {
  title: string;
  text: string;
  action: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted leading-copy">{text}</p>
      <div className="form-actions">
        <button className="button secondary" onClick={onClose}>
          Keep it
        </button>
        <button
          className="button danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {action}
        </button>
      </div>
    </Modal>
  );
}
export const dateLabel = (s: string, year = false) =>
  new Date(`${s}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year ? { year: 'numeric' } : {}),
  });

export function GoalGlyph({ emoji }: { emoji: string }) {
  const Icon =
    (
      {
        '🌱': Sprout,
        '⛩️': Plane,
        '💻': Laptop,
        '🏡': House,
        '✈️': Plane,
        '🚗': Car,
        '🎓': GraduationCap,
        '💛': Heart,
      } as Record<string, typeof Sprout>
    )[emoji] ?? Landmark;
  return <Icon size={22} strokeWidth={1.65} />;
}

/** Announce the final amount; animate only the visual value when a filter changes. */
export function AnimatedValue({ value, format }: { value: number; format: (value: number) => string }) {
  const display = useAnimatedNumber(value, 420);
  return (
    <span>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  );
}
