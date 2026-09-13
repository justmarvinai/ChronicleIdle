import { battle } from './battle';
import { champions } from './champions';
import { currencies } from './currencies';
import { enemies } from './enemies';
import { ui } from './ui';

export const en = { ...currencies, ...ui, ...champions, ...enemies, ...battle } as const;
