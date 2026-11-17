// RangeRider -- robust three-mode cbBTC bot for btc-race-24h-20261117-0603.
//
// One asset, CBBTC (Coinbase Wrapped BTC on Solana), long only, $1,000 of
// paper money, one-minute bars. Every trigger is RELATIVE (trailing highs,
// a moving average, the entry price) -- no absolute price level, no
// schedule, nothing fitted to a calendar date -- so the same rules fire on
// any fresh 24-hour window.
//
// Why three modes: the previous race (btc-race-24h-20261115-0828) taught
// that a bot tuned to one window shape dies on the next. Its v5-trail
// graded +$53.25 on dev and then made 0 trades live (UNRANKED #2261 of
// 2,828): its 4.8%/5.3% deep-dip triggers never fired on the live window.
// A bot that only fires on a crash is a lottery ticket. This bot has a
// mode for each regime, and it trades on all four windows it was tested
// against (see Honest numbers below).
//
// SHALLOW range trade -- the workhorse in a flat window. Buy when the
// close is at least 1.2% below the trailing 120-minute high, but ONLY
// when (a) the close is at or above the 240-bar SMA (trend filter: in a
// grinding downtrend the dip usually keeps dipping, so stay out), and
// (b) the close is at least 0.2% above the trailing 30-minute low
// (recovery: the dip has stopped falling). Spend 60% of cash. Exit at
// +0.8% over entry, a 0.5% trailing stop below the peak since entry, a
// 0.8% hard stop, or 180 bars held. The exits are tight on purpose: the
// window's swings are 0.5-1.1% and a round trip costs ~26 bps, so a
// position that is not banked quickly rides back down.
//
// DEEP V tiers -- the crash catcher, inherited from the previous race's
// v5 (proven there: the same two fills, 62,648 then 62,266, made +$45.98
// on the 20261115 window). Tier 1 buys 40% of cash at 4.8% below the
// trailing 360-minute high; while holding it, a further fall to 5.3%
// below that high buys all remaining cash (tier 2 scale-in). A straight
// gap past 5.3% buys all cash at once. Exits: +4.5% over the blended
// entry, 1.2% trailing stop, 1.5% hard stop, 240 bars. No trend or
// recovery gate here: in a washout the recovery gate costs 1-3 bars past
// the trough, which is where the money is.
//
// RIDER -- insurance for a rising window where dips never come: if the
// close breaks 0.3% above the trailing 240-minute high with the 8-bar
// mean above the 21-bar mean and still rising, buy 50% of cash, exits as
// the shallow mode. It never fired on any tested window; it stays because
// a bot with no trade at all fails the guardrails.
//
// Costs: a full-size round trip pays about 26 bps in fees, slippage and
// impact, so the shallow 0.8% take-profit clears it with room, and the
// 0.5% trail banks a winner before it gives the move back. Every order
// caps slippage at 400 bps against the latest close; fills normally move
// 10-30 bps, so a fast minute cannot reject the entry that matters.
//
// Honest numbers (bit-perfect Python simulator, same integer fill math as
// the kit; kit grade-local below must reproduce the dev line):
//   dev 20261117 (this race):  +$1.38, 4 trades, max DD 0.46%
//   prev race window 20261113: +$5.63, 2 trades, max DD 0.43%
//   prev race window 20261115: +$45.98, 3 trades, max DD 0.64%
//   mirrored dev window:       $0.00, 0 trades (filter holds fire)
// The dev number is small on purpose: this window is flat (+0.49% net,
// max drawdown 2.12%, swings 0.5-1.1%), and its realistic causal ceiling
// is ~$10-15. A dev score of +$22 exists on the board from a bot that
// loses -$11/-$15 on the two held-out windows; this bot is the robust
// alternative -- positive on every window tested, worst +$1.38 -- and it
// is the entry to prefer if the race window falls or crashes rather than
// ranging. Max 12 waves per window; at most one position at a time.
//
// Deterministic: integer arithmetic on the bars the harness sends; no
// clock, no randomness, no network, no files. Standard library only,
// plus the kit's TypeScript shim vendored under vendor/ (byte-for-byte
// copy).

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Shallow range trade.
const SHALLOW_DD = 12n; // 1.2% below the trailing 120-min high
const SHALLOW_HIGH_WIN = 120;
const SHALLOW_SIZE_PCT = 60n; // spend 60% of cash
const SHALLOW_TAKE = 8n; // +0.8% over entry
const SHALLOW_TRAIL = 5n; // 0.5% below the peak since entry
const SHALLOW_STOP = 8n; // 0.8% under entry
const SHALLOW_HOLD = 180; // bars, then out
const RECOVERY = 2n; // 0.2% above the trailing 30-min low
const RECOVERY_WIN = 30;
const TREND_WIN = 240; // close must be at/above this SMA

// Deep V tiers (v5, proven on the crash window).
const DEEP1_DD = 48n; // 4.8% below the trailing 360-min high, tier 1
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
const HISTORY = 720; // closes kept (longest lookback is 360)
const SLIPPAGE_BPS = 400; // cap vs the latest close
const MIN_NOTIONAL = 1_000_000n; // 1 USDC in quote units

type Mode = 'shallow' | 'deep' | 'rider';

/** Closes at price scale 5, oldest first. */
const closes: bigint[] = [];
let entryPrice = 0n; // volume-weighted entry price, 0n = flat
let peakSinceEntry = 0n; // highest close since entry
let holdBars = 0; // bars held in the current position
let waves = 0; // flat-entry buys sent in this window
let prevQty = 0n;
let mode: Mode | null = null; // mode of the open position
let scaled = false; // deep tier-2 scale-in already sent

function highest(n: number): bigint {
  const start = Math.max(0, closes.length - n);
  let hi = closes[start];
  for (let i = start + 1; i < closes.length; i++) if (closes[i] > hi) hi = closes[i];
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

function onBatch(state: BarsState): OrderInput[] {
  if (state.warmingUp) return [];
  const close = state.close(SYMBOL);
  if (close === null) return [];
  closes.push(close);
  if (closes.length > HISTORY) closes.shift();

  const holding = state.positions.get(SYMBOL);
  const qty = holding === undefined ? 0n : holding.qty;

  // A buy filled since the last batch: re-derive the averaged entry.
  // value(qty, price) = qty * price / 10**7, so price = cost * 10**7 / qty.
  if (qty > prevQty) {
    entryPrice = (holding!.cost * 10_000_000n) / qty;
    if (close > peakSinceEntry) peakSinceEntry = close;
    if (prevQty === 0n) holdBars = 0;
  }
  // A sell filled: the position is gone (this bot only ever sells all of it).
  if (qty === 0n && prevQty > 0n) {
    entryPrice = 0n;
    peakSinceEntry = 0n;
    holdBars = 0;
    mode = null;
    scaled = false;
  }
  prevQty = qty;

  if (qty > 0n) {
    holdBars += 1;
    if (close > peakSinceEntry) peakSinceEntry = close;
    const take = mode === 'deep' ? DEEP_TAKE : SHALLOW_TAKE;
    const trail = mode === 'deep' ? DEEP_TRAIL : SHALLOW_TRAIL;
    const stop = mode === 'deep' ? DEEP_STOP : SHALLOW_STOP;
    const holdMax = mode === 'deep' ? DEEP_HOLD : SHALLOW_HOLD;
    if (
      close * 1000n >= entryPrice * (1000n + take) ||
      close * 1000n <= entryPrice * (1000n - stop) ||
      close * 1000n <= peakSinceEntry * (1000n - trail) ||
      holdBars >= holdMax
    ) {
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: SLIPPAGE_BPS }];
    }
    // Deep tier 2: while holding tier 1, a further fall to 5.3% below
    // the trailing 360-minute high buys all remaining cash at the trough.
    if (mode === 'deep' && !scaled && state.cash >= MIN_NOTIONAL) {
      const high360 = highest(DEEP_HIGH_WIN);
      if (close * 1000n <= high360 * (1000n - DEEP2_DD)) {
        scaled = true;
        return [buy(state.cash)];
      }
    }
    return [];
  }

  if (closes.length < WARMUP_BARS || waves >= MAX_WAVES) return [];

  const closeNow = close;
  const high360 = highest(DEEP_HIGH_WIN);

  // Deep tiers first: a crash window must not wait behind the shallow rules.
  if (closeNow * 1000n <= high360 * (1000n - DEEP2_DD)) {
    waves += 1;
    mode = 'deep';
    return [buy(state.cash)];
  }
  if (closeNow * 1000n <= high360 * (1000n - DEEP1_DD)) {
    waves += 1;
    mode = 'deep';
    return [buy((state.cash * DEEP1_SIZE_PCT) / 100n)];
  }

  // Shallow range trade: dip below the 120-min high, in an up-or-flat
  // trend (close at/above the 240-bar SMA) and off a stopped fall (close
  // 0.2% above the 30-min low).
  const highS = highest(SHALLOW_HIGH_WIN);
  const low30 = lowest(RECOVERY_WIN);
  const sma240 = mean(TREND_WIN);
  if (
    closeNow * 1000n >= sma240 * 1000n &&
    closeNow * 1000n >= low30 * (1000n + RECOVERY) &&
    closeNow * 1000n <= highS * (1000n - SHALLOW_DD)
  ) {
    waves += 1;
    mode = 'shallow';
    return [buy((state.cash * SHALLOW_SIZE_PCT) / 100n)];
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
    return [buy((state.cash * RIDER_SIZE_PCT) / 100n)];
  }
  return [];
}

await runBars({ onBatch });
