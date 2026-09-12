import { currencies } from './currencies';
import { ui } from './ui';

export const en = { ...currencies, ...ui } as const;
