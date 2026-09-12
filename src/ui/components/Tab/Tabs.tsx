import { playSfx } from '@audio/index';
import { kitBorder } from '@ui/styles/kit';
import styles from './Tabs.module.css';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  badge?: number;
  disabled?: boolean;
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
            className={[styles.tab, active ? styles.active : ''].join(' ')}
            style={kitBorder(active ? 'ui.dark_ember.banner_plain' : 'ui.dark_ember.banner_dark', 0.28)}
            onMouseEnter={() => !item.disabled && playSfx('ui.hover')}
            onClick={() => {
              if (item.disabled || active) return;
              playSfx('ui.tab');
              onChange(item.key);
            }}
          >
            <span className={`display ${styles.label}`}>{item.label}</span>
            {item.badge ? <span className={`num ${styles.badge}`}>{item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
