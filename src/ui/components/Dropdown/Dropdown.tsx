import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { playSfx } from '@audio/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { kitBorder } from '@ui/styles/kit';
import { VIRTUAL_HEIGHT, ViewportContext } from '@ui/viewport/viewport';
import styles from './Dropdown.module.css';

/** The gap between the control and its open list, in stage pixels (the CSS says the same). */
const LIST_GAP = 4;

export interface DropdownOption<V extends string | number> {
  value: V;
  label: string;
  /** Drawn before the label, in the list and on the closed control — a gear set's emblem, say. */
  icon?: ReactNode;
}

export interface DropdownProps<V extends string | number> {
  options: readonly DropdownOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label?: string;
  width?: number;
  disabled?: boolean;
}

/** Stone dropdown with keyboard navigation (ArrowUp/Down, Enter, Esc). */
export function Dropdown<V extends string | number>({
  options,
  value,
  onChange,
  label,
  width = 260,
  disabled,
}: DropdownProps<V>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const viewport = useContext(ViewportContext);
  const [upward, setUpward] = useState(false);
  const current = options.find((o) => o.value === value);

  /*
   * A list opens downward unless the stage has no room for it there. A control near the foot of
   * a screen — the campaign's difficulty, say — would otherwise open a list the stage clips, and
   * only its first row could ever be chosen. Measured before paint, so it never flashes the wrong
   * way; the stage is scaled as a whole, so a layout height becomes screen pixels by its scale.
   */
  const place = useCallback((): void => {
    const control = root.current?.getBoundingClientRect();
    if (!control) return;
    const height = list.current?.offsetHeight ?? 0;
    const scale = viewport?.scale ?? 1;
    const top = viewport?.offsetY ?? 0;
    const bottom = viewport ? viewport.offsetY + VIRTUAL_HEIGHT * viewport.scale : window.innerHeight;
    const needed = (height + LIST_GAP) * scale;
    const below = bottom - control.bottom;
    const above = control.top - top;
    setUpward(needed > below && above > below);
  }, [viewport]);
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (index: number): void => {
    const option = options[index];
    if (!option) return;
    playSfx('ui.tab');
    onChange(option.value);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent): void => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) choose(highlight);
      else setOpen(true);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div ref={root} className={styles.root} style={{ width }}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={label}
        disabled={disabled}
        className={[styles.trigger, open ? styles.open : ''].join(' ')}
        style={kitBorder('ui.stone_vine.btn_stone_wide', 0.36)}
        onMouseEnter={() => !disabled && playSfx('ui.hover')}
        onClick={() => {
          if (disabled) return;
          playSfx(open ? 'ui.close' : 'ui.open');
          setOpen((o) => !o);
        }}
        onKeyDown={onKey}
      >
        <span className={styles.value}>
          {current?.icon}
          <span className={styles.valueText}>{current?.label ?? ''}</span>
        </span>
        <Glyph glyph="glyph.magic_arrow" size={18} color="var(--gold-2)" className={styles.chevron} />
      </button>
      {open ? (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          data-placement={upward ? 'up' : 'down'}
          className={[styles.list, upward ? styles.up : ''].join(' ')}
          style={kitBorder('ui.dark_ember.frame_sm_thin', 0.35)}
        >
          {options.map((option, index) => (
            <li
              key={String(option.value)}
              role="option"
              aria-selected={option.value === value}
              className={[
                styles.option,
                index === highlight ? styles.highlight : '',
                option.value === value ? styles.selected : '',
              ].join(' ')}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => choose(index)}
            >
              {option.icon}
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
