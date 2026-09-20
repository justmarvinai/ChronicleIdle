/**
 * The project's GSAP, configured once (docs/tech/ARCHITECTURE.md §4): every timeline in `render/`
 * imports it from here rather than from the package, so nothing can animate under the default
 * ticker.
 *
 * GSAP ships with **lag smoothing** on: a frame longer than half a second is treated as a stall
 * and advanced by 33 ms instead of the time that really passed. On a machine that cannot hold the
 * frame rate that turns a fight into slow motion rather than into dropped frames — a stand that
 * plays out in 13 s here took 57 s under a 20× CPU throttle, and on a CI runner it ran past five
 * minutes. `CLAUDE.md` §5.6 asks for frames to be dropped, not for the fight to stretch, and a
 * player on a weak laptop should wait exactly as long as a player on a fast one.
 *
 * Nothing is lost by turning it off: the battle stage and the summon ritual both pause their
 * timelines while the document is hidden, so the gap a hidden tab leaves is never played back.
 */
import { gsap } from 'gsap';

gsap.ticker.lagSmoothing(0);

export { gsap };
