/**
 * `step`, `chapter`, `provision` and `gift`: the builders the six tutorial files are written with
 * (docs/tech/CONTENT_AUTHORING.md §9). Ids and i18n keys follow from where a step sits, so a
 * chapter file reads as the script it is — a trigger, a target, a line, and what finishes it.
 */
import { ENERGY_PROVISIONS, type ProvisionId } from '@content/balance/energy';
import type { CurrencyAmount } from '@content/currencies/types';
import type {
  TutorialChapterDef,
  TutorialCondition,
  TutorialGrant,
  TutorialStepDef,
  TutorialTarget,
  TutorialTrigger,
} from './types';

interface StepInput {
  /** The step waits for this before it opens; omitted means "right after the one before it". */
  when?: TutorialCondition;
  spotlight: TutorialTarget[];
  /** Defaults to the spotlight: what the pointer rests on is what the player may touch. */
  allow?: 'all' | TutorialTarget[];
  complete: TutorialCondition;
  grant?: TutorialGrant;
  script?: 'battle' | 'summon';
  version?: number;
}

/**
 * One step, still missing where it sits — `chapter` supplies that, so a step cannot end up with an
 * id or a dialogue key that disagrees with the lesson it belongs to.
 */
export function step(input: StepInput): (chapter: number, index: number) => TutorialStepDef {
  return (chapter, index) => ({
    id: `tut.${chapter}.${index}`,
    chapter,
    index,
    dialogue: `tut.${chapter}.${index}.text`,
    ...(input.when ? { when: input.when } : {}),
    spotlight: input.spotlight,
    allow: input.allow ?? input.spotlight,
    complete: input.complete,
    ...(input.grant ? { grant: input.grant } : {}),
    ...(input.script ? { script: input.script } : {}),
    version: input.version ?? 1,
  });
}

interface ChapterInput {
  /** `<snake_case>`; the id becomes `tut.<slug>` and the name `tut.chapter.<slug>.name`. */
  slug: string;
  index: number;
  trigger: TutorialTrigger;
  steps: ((chapter: number, index: number) => TutorialStepDef)[];
  /** Chapter 6's lessons stand alone; every other chapter is walked in order. */
  sequential?: boolean;
  /** Chapter 1 is the one that cannot be skipped (owner's answer Q4). */
  skippable?: boolean;
  version?: number;
}

export function chapter(input: ChapterInput): TutorialChapterDef {
  return {
    id: `tut.${input.slug}`,
    index: input.index,
    name: `tut.chapter.${input.slug}.name`,
    trigger: input.trigger,
    steps: input.steps.map((make, position) => make(input.index, position + 1)),
    sequential: input.sequential ?? true,
    skippable: input.skippable ?? true,
    version: input.version ?? 1,
  };
}

/**
 * A Chronicler's Provision: the energy a chapter hands over, taken from the balance table rather
 * than written twice (`ECONOMY.md` §5.1). The id is the one the save records, so a chronicle is
 * paid once however often the step is looked at.
 */
export function provision(id: ProvisionId): TutorialGrant {
  return { id, currencies: [{ currency: 'energy', amount: ENERGY_PROVISIONS[id] }] };
}

/** Anything else a step hands over — Eldric's kept-back shard. */
export function gift(slug: string, ...currencies: CurrencyAmount[]): TutorialGrant {
  return { id: `tutorial.gift.${slug}`, currencies };
}
