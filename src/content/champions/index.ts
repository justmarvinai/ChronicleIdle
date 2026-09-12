/**
 * Every champion definition, in index order (CHAMPIONS.md §4). Explicit imports keep the list
 * usable from Node tooling (validator, tests) as well as the browser bundle.
 */
import type { ChampionDef, ChampionId } from './types';
import gil_scrapper from './gil_scrapper';
import wenna_novice from './wenna_novice';
import bran_militia from './bran_militia';
import orla_hedge_witch from './orla_hedge_witch';
import tobbe_pikeman from './tobbe_pikeman';
import mire_stalker from './mire_stalker';
import sister_maelis from './sister_maelis';
import ser_corvin from './ser_corvin';
import reva_ashblade from './reva_ashblade';
import anuria from './anuria';
import darius from './darius';
import khazgor from './khazgor';
import maruan from './maruan';
import rattledagger from './rattledagger';
import sethlurias from './sethlurias';
import thordakk from './thordakk';
import aurelia_dawnwarden from './aurelia_dawnwarden';
import vorrak_bloodhowl from './vorrak_bloodhowl';
import seraphine_vale from './seraphine_vale';
import morrigan_nightweaver from './morrigan_nightweaver';
import kaelith_stormcaller from './kaelith_stormcaller';
import eldric_chronicler from './eldric_chronicler';
import varkos_sundered_king from './varkos_sundered_king';

export const CHAMPIONS: readonly ChampionDef[] = [
  gil_scrapper,
  wenna_novice,
  bran_militia,
  orla_hedge_witch,
  tobbe_pikeman,
  mire_stalker,
  sister_maelis,
  ser_corvin,
  reva_ashblade,
  anuria,
  darius,
  khazgor,
  maruan,
  rattledagger,
  sethlurias,
  thordakk,
  aurelia_dawnwarden,
  vorrak_bloodhowl,
  seraphine_vale,
  morrigan_nightweaver,
  kaelith_stormcaller,
  eldric_chronicler,
  varkos_sundered_king,
];

export const CHAMPION_BY_ID: Readonly<Record<ChampionId, ChampionDef>> = Object.fromEntries(
  CHAMPIONS.map((c) => [c.id, c]),
) as Record<ChampionId, ChampionDef>;
