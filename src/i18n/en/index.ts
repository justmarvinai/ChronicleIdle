import { champions } from './champions';
import { currencies } from './currencies';
import { ui } from './ui';

export const en = { ...currencies, ...ui, ...champions } as const;
