import type { ReactNode } from 'react';
import { playSfx } from '@audio/index';
import type { GlyphKey } from '@assets/manifest.generated';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { kitBorder } from '@ui/styles/kit';
import styles from './Tabs.module.css';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  /** A mark before the label, for tabs that name a kind of work (the Tavern's three tracks). */
  glyph?: GlyphKey;
  /** A painted mark instead of a glyph — the coin and the gem over the Market's two shelves. */
  icon?: ReactNode;
  badge?: number;
  disabled?: boolean;
  testId?: string;
}

export interface TabsProps<K extends string> {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/** Banner-shaped tabs (ember when active, dark otherwise). */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  orientation = 'horizontal',
  className,
}: TabsProps<K>) {
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      className={[styles.tabs, styles[orientation], className ?? ''].join(' ')}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            data-testid={item.testId}
            className={[styles.tab, active ? styles.active : ''].join(' ')}
            style={kitBorder(active ? 'ui.dark_ember.banner_plain' : 'ui.dark_ember.banner_dark', 0.28)}
            onMouseEnter={() => !item.disabled && playSfx('ui.hover')}
            onClick={() => {
              if (item.disabled || active) return;
              playSfx('ui.tab');
              onChange(item.key);
            }}
          >
            {item.icon ? (
              <span className={styles.icon}>{item.icon}</span>
            ) : item.glyph ? (
              <Glyph glyph={item.glyph} size={24} className={styles.glyph} />
            ) : null}
            <span className={`display ${styles.label}`}>{item.label}</span>
            {item.badge ? <span className={`num ${styles.badge}`}>{item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
