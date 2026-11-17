[![make.fun](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/giber76/btc-race-20261117-robust/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/giber76/btc-race-20261117-robust/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603)

# RangeRider — robust cbBTC trading bot

Entry for [make.fun btc-race-24h-20261117-0603](https://make.fun/bounty/btc-race-24h-20261117-0603)
("Race a BTC trading bot live for 24 hours", $250, top 10 on the live 24h race window).

## Strategy

A three-mode bot with only relative triggers (trailing highs, a moving average,
the entry price) — no absolute price level, no schedule — so the same rules fire
on any fresh 24-hour window. Built after the previous race's lesson: that race's
bot graded +$53.25 on dev and then made 0 live trades and finished unranked,
because its deep-dip triggers never fired on live data.

- **Snapback (flat windows, hybridised from v1's Two-Tier Snapback):** buy when
  the close is ≥ 2.0% below the trailing 420-minute high of bar highs, only if
  the close is at least 0.2% above the trailing 30-minute low (the dip has
  stopped falling). No trend gate, no bounce gate: the 2.0% dip plus the
  recovery gate is what keeps the falling windows positive — shallower dips
  (1.6–1.8%) add only losing trades out of sample. 95% of cash (100% fails the
  20261113 window). Exit: +1.0% take-profit, 0.8% trailing stop once +0.8% up,
  1.0% hard stop, 240-bar max hold. A 20-bar cooldown after an exit fill keeps
  the bot from re-entering a still-falling market; a 2% loss cap latches snap
  entries off once marked equity falls below $980. Tier 2 (2.7% dip) takes
  wider exits (+2.5% / −2.5%). The old shallow range trade was removed: once
  snapback is present it adds nothing on dev.
- **Deep V tiers (crash windows, inherited from the previous race's v5):** tier 1
  buys 40% of cash at 4.8% below the trailing 360-minute high; while holding it,
  a further fall to 5.3% buys all remaining cash. A straight gap past 5.3% buys
  all cash at once. Exit: +4.5% take-profit, 1.2% trailing stop, 1.5% hard stop,
  240-bar max hold.
- **Breakout rider (rising windows):** if the close breaks 0.3% above the trailing
  240-minute high with the 8-bar mean above the 21-bar mean and still rising, buy
  50% of cash, shallow exits. Insurance for a window where dips never come.
- One position at a time, max 12 waves per window. A full-size round trip costs
  ~26 bps in fees, slippage and impact.

## Grades (kit `grade-local`, driver process, two executions, L1 regrade reproduced byte for byte)

| Window | Net PnL | Trades | Max drawdown |
|---|---|---|---|
| Dev window (this race, frozen 24h) | **+$8.27** | 2 | 0.55% |
| Held-out window 20261113 (falling day, −4.9%) | **+$8.56** | 6 | 1.72% |
| Held-out window 20261115 (crash + V-recovery) | **+$31.26** | 7 | 2.72% |
| Mirrored dev window | **+$17.35** | 4 | 0.39% |

Worst window **+$8.27** (was +$0.00 in v1 of this bot). The dev number is small
on purpose: this window is flat (+0.49% net, max drawdown 2.12%, swings
0.5–1.1%), and it supports exactly one good snapback trade — a second dev wave
loses out of sample, so the bot deliberately takes one trade there and waits.
The v1 entry this replaces graded +$22.35 on dev but was negative on both
held-out windows; this version trades dev upside for never losing out of
sample. Net PnL at 2x fees on dev stays positive (+$7.51).

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, standard library only).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's `sdk/makefun-bars.ts` shim.
- `LICENSE` — MIT.
