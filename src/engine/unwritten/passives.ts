/**
 * Turning the Unwritten's passive templates into the battle's passives. A passive is named after
 * the thing that grants it — the inscription, the relic, the affix — so when it fires the battle
 * shows that name and icon, and its id is unique per source and position so `oncePerBattle` and
 * the engine's bookkeeping never confuse two of them.
 */
import type { SpellKey } from '@assets/manifest.generated';
import type { PassiveDef } from '@content/champions/types';
import type { PassiveTemplate } from '@content/unwritten/types';

export interface PassiveSource {
  /** Unique per source and level: `inscription.retribution.2`. */
  id: string;
  name: string;
  text: string;
  icon: SpellKey;
}

export function passivesOf(
  source: PassiveSource,
  templates: readonly PassiveTemplate[] | undefined,
): PassiveDef[] {
  return (templates ?? []).map((template, index) => ({
    id: `${source.id}.${index}`,
    name: source.name,
    description: source.text,
    icon: source.icon,
    trigger: template.trigger,
    effects: [...template.effects],
    ...(template.oncePerBattle ? { oncePerBattle: true } : {}),
  }));
}
