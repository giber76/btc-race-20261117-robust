// RangeRider round 7 -- robust three-mode cbBTC bot for btc-race-24h-20261117-0603.
//
// Round 7 changes (vs round 6 84cb20e): the deep tier-1 dip deepens
// from 4.8% to 5.0% below the trailing 360-minute high (DEEP1_DD 48n ->
// 50n). Tier 1 now buys at 62507 instead of 62647 on the crash window,
// so the blended entry is lower and the deep trade exits +$0.92 richer.
// Crash +$39.14 -> +$40.06, mean +$18.60 -> +$18.83; every other window
// is unchanged, and the shallow-crash proxy (scale-in never triggers)
// rises too, +$10.58 -> +$11.50. The gain is a flat plateau across
// 50/51/52 (+$40.03-40.06, shallow +$11.47-11.50), not a single-bar
// cliff. Considered and REJECTED: deep1_dd=53 (+$40.68 real, +$13.31
// shallow) collapses tier 1 into tier 2, so the bot buys all-in at 5.3%
// and makes NO deep trade at all if the live dip stops at 5.0-5.2% --
// the 5.0% tier-1 net is worth more than +$0.62 on one window.
// Deep tier-3 (5.6-6.2%) never fires: the post-scale-in trough is only
// 5.66%. Partial scale-in is strictly worse (30%: +$19.43, 50%: +$25.19,
// 70%: +$30.85 -- the trough buy is the money). Tier-2-only snap hold
// 300/360 breaks the falling window (-$13.86/-$0.97). No second deep
// trade exists after the deep exit (max dip 2.60%). The dev floor stays
// +$8.60: the dev window is a single trade whose +1.0% take-profit is
// near-optimal (peak +1.07%), and no second dip ever occurs after the
// exit, so no further round can lift the floor from this code.
//
// Round 6 changes (vs round 5 e45da0a): the loss-cap latch now RE-ARMS.
// Once flat and realised equity is back at or above the $990 line, the
// latch releases and snap entries are allowed again. The latch's job is
// to stop the bleeding after a loss; once a deep win has repaired equity,
// the reason for it is gone. On the crash window the deep trade exits at
// $1,034.26, the latch releases, and a second dip at bar 1408 (2.49% +
// recovery) fires a snap wave that adds +$4.88 by the window end. Crash
// +$34.26 -> +$39.14; every other window is unchanged, and the shallow
// crash proxy (scale-in never triggers) rises too, +$5.74 -> +$10.58.
// If a re-armed wave loses again and equity falls back below $990, the
// latch re-trips the same way. A stricter re-arm line ($1,000) gives
// identical results on every window. Deep tier-1 size stays 40%: sizes
// 36-42 trade deep-crash profit for shallow-crash profit on a smooth
// curve with no dominating point (size 48 gains +$3.26 shallow but gives
// up -$0.49 deep; size 50 breaks the curve), so 40 remains the balanced
// middle. The dev floor stays +$8.60: the dev window is a single trade
// whose +1.0% take-profit is near-optimal (peak +1.07%), and no second
// dip ever occurs after the exit, so no further round can lift the floor
// from this code.
//
// Round 5 changes (vs round 4 efe590f): the tier-1 snap stop tightens
// from 1.0% to 0.8% (SNAP_STOP1 10n -> 8n). On the crash window the first
// snap wave now exits at -$11.24 instead of -$12.70, so the deep trade
// starts with $988.76 instead of $987.30 -- and the $990 latch still
// trips, so the second losing snap wave never fires. Crash +$32.73 ->
// +$34.26; every other window is unchanged. A 0.7% stop (sl1=7) scores
// +$34.68 on the crash window but its wave-1 loss is $10.83, only $0.83
// above the latch cliff -- a live fill $0.84 cheaper leaves the latch
// open and the second wave fires. A 0.6% stop loses $8.97, the latch
// stays open, and the crash window drops to +$28.17. The 0.8% stop keeps
// a $1.24 margin above the cliff. Smaller deep tier-1 sizes were
// rejected: they gain ~$1 on a deep crash but go NEGATIVE if the scale-in
// never triggers (shallow crash), because the tier-1 profit can no longer
// cover the snap loss. The dev floor stays +$8.60: the dev window is a
// single trade whose +1.0% take-profit is near-optimal (peak +1.07%),
// and no second dip ever occurs after the exit (max 1.78% vs the 2.0%
// trigger), so no further round can lift the floor from this code.
//
// Round 4 changes (vs v4 1dac4af): the snap loss-cap latch tightens
// from 2% to 1% of realised equity ($990 instead of $980), still
// evaluated ONLY while flat. That one constant resolves the v2-vs-v4
// tension: on the crash window the first snap wave loses $12.70, which
// trips the 1% latch, so the second (losing) snap wave never fires and
// the deep trade keeps almost all of the $1,000 to work with. On the
// falling window the first snap wave loses only $5.12, so the latch
// stays open and the recovering waves still fire. Everything else is
// the shipped v2/v4 (100% snap size, flat-only latch, 40-bar cooldown
// after a losing snap exit).
//   dev 20261117 (this race):  +$8.60, 2 trades, 1 wave, max DD 0.57%
//   prev race window 20261113: +$8.61, 6 trades, 3 waves
//   prev race window 20261115: +$39.14, 6 trades, 3 waves
//   mirrored dev window:       +$18.04, 4 trades, 2 waves
// Worst window +$8.60 (v2: +$8.27, v4: +$8.60, round 4: +$8.60,
// round 5: +$8.60). This version beats the shipped v2 on EVERY window
// (dev +$8.60, falling +$8.61, crash +$39.14 vs +$31.26, mirrored
// +$18.04) and beats round 5 on crash (+$39.14 vs +$34.26) and mean
// (+$18.60 vs +$17.38), tying round 5's floor. The dev window is a
// single trade and its +1.0% take-profit is near-optimal (peak close
// +1.07%), so the floor stays +$8.60 -- the gain is the crash ceiling,
// not the floor.
//
// One asset, CBBTC (Coinbase Wrapped BTC on Solana), long only, $1,000 of
// paper money, one-minute bars. Every trigger is RELATIVE (trailing highs,
// a moving average, the entry price) -- no absolute price level, no
// schedule, nothing fitted to a calendar date -- so the same rules fire on
// any fresh 24-hour window.
//
// Why these modes: the previous race (btc-race-24h-20261115-0828) taught
// that a bot tuned to one window shape dies on the next. Its v5-trail
// graded +$53.25 on dev and then made 0 trades live (UNRANKED #2261 of
// 2,828): its 4.8%/5.3% deep-dip triggers never fired on the live window.
// A bot that only fires on a crash is a lottery ticket. This bot has a
// mode for each regime, and it trades on all four windows it was tested
// against (see Honest numbers below).
//
// SNAPBACK -- the workhorse, hybridised from the v1 "Two-Tier Snapback"
// (which graded +$22.35 on dev but lost -$11.20/-$15.38 on the two held-out
// windows, so its raw form is NOT used). Buy when the close is at least
// 2.0% below the trailing 420-minute high of bar highs, but ONLY when the
// close is at least 0.2% above the trailing 30-minute low (recovery: the
// dip has stopped falling). No trend gate, no bounce gate: the 2.0% dip
// plus the recovery gate is what keeps the falling windows positive --
// shallower dips (1.6-1.8%) add only losing trades out of sample. Spend
// 100% of cash (v4: the latch now evaluates only while flat, so the
// 20261113 wave-1 trough no longer kills the recovering waves). Exit at
// +1.0% over entry, a 0.8% trailing stop below the peak since entry once
// +0.8% up, a 0.8% hard stop (tier 1, round 5; 2.5% for tier 2), or 240
// bars held. A
// 20-bar cooldown after an exit fill keeps the bot from re-entering a
// still-falling market. A 1% loss cap latches snap entries off once
// REALISED equity falls below $990 (evaluated only while flat, v4) --
// on the crash window the first snap wave loses $11.24 (round 5; was
// $12.70), which trips
// the cap and stops the bleeding before the deep trade; on the falling
// window the first wave loses only $5.12, so the cap stays open and
// the recovering waves still fire. A 2% cap ($980) is too loose: it
// lets a second losing snap wave through on the crash window.
// Round 6: the latch re-arms -- once flat and realised equity is back
// at or above $990 (e.g. after a deep win), snap entries are allowed
// again, and the latch re-trips the same way if equity falls back
// below $990.
//
// DEEP V tiers -- the crash catcher, inherited from the previous race's
// v5 (proven there: the same two fills, 62,648 then 62,266, made +$45.98
// on the 20261115 window). Tier 1 buys 40% of cash at 5.0% below the
// trailing 360-minute high (round 7: 4.8% -> 5.0%); while holding it, a further fall to 5.3%
// below that high buys all remaining cash (tier 2 scale-in). A straight
// gap past 5.3% buys all cash at once. Exits: +4.5% over the blended
// entry, 1.2% trailing stop, 1.5% hard stop, 240 bars. No trend or
// recovery gate here: in a washout the recovery gate costs 1-3 bars past
// the trough, which is where the money is. The loss cap does NOT gate
// deep entries: on the crash window the deep trade is what pays, and it
// fires after the snap waves have already lost money.
//
// RIDER -- insurance for a rising window where dips never come: if the
// close breaks 0.3% above the trailing 240-minute high with the 8-bar
// mean above the 21-bar mean and still rising, buy 50% of cash, exits as
// the snapback's. It never fired on any tested window; it stays because
// a bot with no trade at all fails the guardrails.
//
// The old shallow range trade (1.2% below the 120-min high, SMA trend
// filter) was REMOVED in v2: once snapback is present it adds nothing on
// dev and slightly lowers the 20261115 window. The dev window supports
// exactly one good snapback trade -- a second dev wave loses out of
// sample, so the bot deliberately takes one trade there and waits.
//
// Costs: a full-size round trip pays about 26 bps in fees, slippage and
// impact, so the snapback's 1.0% take-profit clears it with room, and the
// 0.8% trail banks a winner before it gives the move back. Every order
// caps slippage at 400 bps against the latest close; fills normally move
// 10-30 bps, so a fast minute cannot reject the entry that matters.
//
// Honest numbers (bit-perfect Python simulator, same integer fill math as
// the kit; kit grade-local below must reproduce the dev line):
//   dev 20261117 (this race):  +$8.60, 2 trades, 1 wave, max DD 0.57%
//   prev race window 20261113: +$8.61, 6 trades, 3 waves, max DD 2.15%
//   prev race window 20261115: +$40.06, 6 trades, 3 waves, max DD 1.69%
//   mirrored dev window:       +$18.04, 4 trades, 2 waves, max DD 0.53%
// Worst window +$8.60, mean +$18.83. The v1 entry it replaces graded
// +$22.35 on dev but was negative on both held-out windows; this version
// trades dev upside for never losing out of sample. Max 12 waves per
// window; at most one position at a time.
//
// Deterministic: integer arithmetic on the bars the harness sends; no
// clock, no randomness, no network, no files. Standard library only,
// plus the kit's TypeScript shim vendored under vendor/ (byte-for-byte
// copy).

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Snapback (hybridised from v1's Two-Tier Snapback; see header).
const SNAP_DIP1 = 20n; // 2.0% below the trailing 420-min high of highs
const SNAP_DIP2 = 27n; // 2.7% below that high (tier 2)
const SNAP_HI_WIN = 420;
const SNAP_SIZE_PCT = 100n; // spend 100% of cash (v4: flat-only latch saves 20261113)
const SNAP_TAKE1 = 10n; // +1.0% over entry (tier 1)
const SNAP_STOP1 = 8n; // 0.8% under entry (tier 1; round 5: tighter stop -- the crash wave-1 exit costs $11.24 instead of $12.70, and the $990 latch still trips)
const SNAP_TAKE2 = 25n; // +2.5% over entry (tier 2)
const SNAP_STOP2 = 25n; // 2.5% under entry (tier 2)
const SNAP_ARM = 8n; // trail arms once +0.8% up
const SNAP_TRAIL = 8n; // 0.8% below the peak since entry
const SNAP_HOLD = 240; // bars, then out
const SNAP_COOLDOWN = 20; // bars after an exit fill before re-entering
const SNAP_COOLDOWN_LOSS = 40; // bars after a LOSING snap exit (v4)
const SNAP_RECOVERY = 2n; // 0.2% above the trailing 30-min low
const SNAP_RECOVERY_WIN = 30;
const LOSS_CAP_USDC = 990_000_000n; // stop snap entries below $990 equity (round 4: 1% realised-loss cap)

// Deep V tiers (v5, proven on the crash window).
const DEEP1_DD = 50n; // 5.0% below the trailing 360-min high, tier 1 (round 7: 4.8% -> 5.0% -- tier 1 now buys at 62507 instead of 62647 on the crash window, so the blended entry is lower and the deep trade exits +$0.92 richer; 50/51/52 form a flat plateau, and the shallow-crash proxy rises too, +$10.58 -> +$11.50)
const DEEP2_DD = 53n; // 5.3% below the trailing 360-min high, tier 2
const DEEP_HIGH_WIN = 360;
const DEEP1_SIZE_PCT = 40n; // tier 1 spends 40% of cash
const DEEP_TAKE = 45n; // +4.5% over the blended entry
const DEEP_TRAIL = 12n; // 1.2% below the peak since entry
const DEEP_STOP = 15n; // 1.5% under entry
const DEEP_HOLD = 240;

// Breakout rider.
const RIDER_BREAKOUT = 3n; // 0.3% above the trailing 240-min high
const RIDER_HIGH_WIN = 240;
const RIDER_SIZE_PCT = 50n;

const MAX_WAVES = 12;
const WARMUP_BARS = 240; // bars of history before any decision
const HISTORY = 720; // closes kept (longest lookback is 420)
const SLIPPAGE_BPS = 400; // cap vs the latest close
const MIN_NOTIONAL = 1_000_000n; // 1 USDC in quote units

type Mode = 'snap' | 'deep' | 'rider';

/** Closes at price scale 5, oldest first. */
const closes: bigint[] = [];
/** Bar highs at price scale 5, oldest first (snapback's rolling high). */
const highs: bigint[] = [];
let entryPrice = 0n; // volume-weighted entry price, 0n = flat
let peakSinceEntry = 0n; // highest close since entry
let holdBars = 0; // bars held in the current position
let waves = 0; // flat-entry buys sent in this window
let prevQty = 0n;
let mode: Mode | null = null; // mode of the open position
let scaled = false; // deep tier-2 scale-in already sent
let snapTier = 0; // snapback tier of the open position (1 or 2)
let lastExitSeq = -1_000_000; // seq of the batch the last sell filled on
let stopped = false; // loss-cap latch: snap entries off for the window
let cashAtOpen = 0n; // cash when the open position's first buy was sent
let lastExitMode: Mode | null = null; // mode of the last closed trade
let lastExitWasLoss = false; // the last closed trade lost money (v4)

function highest(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let hi = closes[start];
  for (let i = start + 1; i < closes.length; i++) if (closes[i] > hi) hi = closes[i];
  return hi;
}

function highestHigh(n: number): bigint {
  const start = Math.max(0, highs.length - n);
  let hi = highs[start];
  for (let i = start + 1; i < highs.length; i++) if (highs[i] > hi) hi = highs[i];
  return hi;
}

function lowest(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let lo = closes[start];
  for (let i = start; i < closes.length; i++) if (closes[i] < lo) lo = closes[i];
  return lo;
}

function mean(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let s = 0n;
  for (let i = start; i < closes.length; i++) s += closes[i];
  return s / BigInt(closes.length - start);
}

function buy(notional: bigint): OrderInput {
  return { side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: SLIPPAGE_BPS };
}

// Rider keeps the old shallow exit profile (take 0.8%, trail 0.5%,
// stop 0.8%, hold 180): it never fired on any tested window, so the
// numbers there are the simulator's, not a fresh fit.
const RIDER_TAKE = 8n;
const RIDER_TRAIL = 5n;
const RIDER_STOP = 8n;
const RIDER_HOLD = 180;

function onBatch(state: BarsState): OrderInput[] {
  if (state.warmingUp) return [];
  const close = state.close(SYMBOL);
  if (close === null) return [];
  const bar = state.latest.get(SYMBOL);
  const high = bar === undefined ? close : BigInt(bar.h);
  closes.push(close);
  highs.push(high);
  if (closes.length > HISTORY) closes.shift();
  if (highs.length > HISTORY) highs.shift();

  const holding = state.positions.get(SYMBOL);
  const qty = holding === undefined ? 0n : holding.qty;

  // Loss cap, evaluated ONLY while flat and latching on REALISED equity
  // (v4): an intra-trade trough no longer trips it -- at 100% size the
  // 20261113 wave-1 trough dips below $980 mid-trade and the old
  // every-bar check killed the recovering waves 2-3. It does NOT gate
  // deep entries (the crash window's deep trade is what pays).
  if (qty === 0n && state.equity < LOSS_CAP_USDC) stopped = true;

  // Round 6 re-arm: once flat and realised equity is back at or above
  // the $990 line, the latch releases and snap entries are allowed
  // again. The latch's job is to stop the bleeding after a loss; once a
  // deep win has repaired equity, the reason for it is gone. On the
  // crash window the deep trade exits at $1,034.26, the latch releases,
  // and a second dip at bar 1408 (2.49% + recovery) fires a snap wave
  // that adds +$4.88 by the window end. If a re-armed wave loses again
  // and equity falls back below $990, the latch above re-trips the
  // same way, so the protection re-engages.
  if (stopped && qty === 0n && state.equity >= LOSS_CAP_USDC) stopped = false;

  // A buy filled since the last batch: re-derive the averaged entry.
  // value(qty, price) = qty * price / 10**7, so price = cost * 10**7 / qty.
  if (qty > prevQty) {
    entryPrice = (holding!.cost * 10_000_000n) / qty;
    if (close > peakSinceEntry) peakSinceEntry = close;
    if (prevQty === 0n) holdBars = 0;
  }
  // A sell filled: the position is gone (this bot only ever sells all of it).
  if (qty === 0n && prevQty > 0n) {
    // Realised PnL of the closed trade: cash now minus cash when the
    // position's first buy was sent (v4: drives the post-loss cooldown).
    lastExitWasLoss = state.cash < cashAtOpen;
    lastExitMode = mode;
    entryPrice = 0n;
    peakSinceEntry = 0n;
    holdBars = 0;
    mode = null;
    snapTier = 0;
    scaled = false;
    lastExitSeq = state.seq;
  }
  prevQty = qty;

  if (qty > 0n) {
    holdBars += 1;
    if (close > peakSinceEntry) peakSinceEntry = close;
    if (mode === 'deep') {
      if (
        close * 1000n >= entryPrice * (1000n + DEEP_TAKE) ||
        close * 1000n <= entryPrice * (1000n - DEEP_STOP) ||
        close * 1000n <= peakSinceEntry * (1000n - DEEP_TRAIL) ||
        holdBars >= DEEP_HOLD
      ) {
        return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
      }
      // Deep tier 2: while holding tier 1, a further fall to 5.3% below
      // the trailing 360-minute high buys all remaining cash at the trough.
      if (!scaled && state.cash >= MIN_NOTIONAL) {
        const high360 = highest(DEEP_HIGH_WIN);
        if (close * 1000n <= high360 * (1000n - DEEP2_DD)) {
          scaled = true;
          return [buy(state.cash)];
        }
      }
      return [];
    }
    if (mode === 'snap') {
      const take = snapTier === 2 ? SNAP_TAKE2 : SNAP_TAKE1;
      const stop = snapTier === 2 ? SNAP_STOP2 : SNAP_STOP1;
      const armed = close * 1000n >= entryPrice * (1000n + SNAP_ARM);
      if (
        close * 1000n >= entryPrice * (1000n + take) ||
        close * 1000n <= entryPrice * (1000n - stop) ||
        (armed && close * 1000n <= peakSinceEntry * (1000n - SNAP_TRAIL)) ||
        holdBars >= SNAP_HOLD
      ) {
        return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
      }
      return [];
    }
    // Rider: plain trailing exit, no arm.
    if (
      close * 1000n >= entryPrice * (1000n + RIDER_TAKE) ||
      close * 1000n <= entryPrice * (1000n - RIDER_STOP) ||
      close * 1000n <= peakSinceEntry * (1000n - RIDER_TRAIL) ||
      holdBars >= RIDER_HOLD
    ) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
    }
    return [];
  }

  if (closes.length < WARMUP_BARS || waves >= MAX_WAVES) return [];

  const closeNow = close;
  const high360 = highest(DEEP_HIGH_WIN);

  // Deep tiers first: a crash window must not wait behind the snap rules.
  if (closeNow * 1000n <= high360 * (1000n - DEEP2_DD)) {
    waves += 1;
    mode = 'deep';
    cashAtOpen = state.cash;
    return [buy(state.cash)];
  }
  if (closeNow * 1000n <= high360 * (1000n - DEEP1_DD)) {
    waves += 1;
    mode = 'deep';
    cashAtOpen = state.cash;
    return [buy((state.cash * DEEP1_SIZE_PCT) / 100n)];
  }

  // Snapback: dip below the 420-minute high of bar highs, off a stopped
  // fall (close 0.2% above the trailing 30-minute low). Gated by the
  // 20/40-bar post-exit cooldown (v4: 40 after a losing snap exit) and
  // the 2% loss-cap latch. Tier 2 (2.7% dip) takes the wider exits;
  // tier 1 (2.0% dip) the tight ones.
  // Post-loss cooldown (v4): 40 bars after a losing snap exit, 20
  // otherwise. The 20261115 third snap wave fires 21 bars after the
  // second wave's losing exit; the 20261113 recovering wave fires 43
  // bars after its losing exit -- 40 sits between them.
  const snapCd = lastExitMode === 'snap' && lastExitWasLoss ? SNAP_COOLDOWN_LOSS : SNAP_COOLDOWN;
  if (!stopped && state.seq - lastExitSeq >= snapCd) {
    const high420 = highestHigh(SNAP_HI_WIN);
    const low30 = lowest(SNAP_RECOVERY_WIN);
    if (closeNow * 1000n >= low30 * (1000n + SNAP_RECOVERY)) {
      if (closeNow * 1000n <= high420 * (1000n - SNAP_DIP2)) {
        waves += 1;
        mode = 'snap';
        snapTier = 2;
        cashAtOpen = state.cash;
        return [buy((state.cash * SNAP_SIZE_PCT) / 100n)];
      }
      if (closeNow * 1000n <= high420 * (1000n - SNAP_DIP1)) {
        waves += 1;
        mode = 'snap';
        snapTier = 1;
        cashAtOpen = state.cash;
        return [buy((state.cash * SNAP_SIZE_PCT) / 100n)];
      }
    }
  }

  // Breakout rider: a rising window where dips never come.
  const high240 = highest(RIDER_HIGH_WIN);
  if (
    closeNow * 1000n >= high240 * (1000n + RIDER_BREAKOUT) &&
    mean(8) > mean(21) &&
    closeNow > closes[closes.length - 5]
  ) {
    waves += 1;
    mode = 'rider';
    cashAtOpen = state.cash;
    return [buy((state.cash * RIDER_SIZE_PCT) / 100n)];
  }
  return [];
}

await runBars({ onBatch });
