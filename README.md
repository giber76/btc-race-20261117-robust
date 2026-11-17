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

- **Shallow range trade (flat windows):** buy when the close is ≥ 1.2% below the
  trailing 120-minute high, only if the close is at/above the 240-bar SMA (trend
  filter: in a grinding downtrend the dip usually keeps dipping) and at least
  0.2% above the trailing 30-minute low (the dip has stopped falling). 60% of
  cash. Exit: +0.8% take-profit, 0.5% trailing stop, 0.8% hard stop, 180-bar max
  hold.
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
| Dev window (this race, frozen 24h) | **+$1.38** | 4 | 0.46% |
| Held-out window 20261113 (falling day, −4.9%) | **+$5.63** | 2 | 0.43% |
| Held-out window 20261115 (crash + V-recovery) | **+$45.98** | 3 | 0.64% |
| Mirrored dev window | $0.00 | 0 | 0.00% |

The dev number is small on purpose: this window is flat (+0.49% net, max
drawdown 2.12%, swings 0.5–1.1%), and its realistic causal ceiling is ~$10–15.
This is the robust alternative to a dev-fitted entry: positive on every window
tested (worst +$1.38), including the two falling/crash windows where a
shallow-dip-only bot loses money. Net PnL at 2x fees stays positive on all
three real windows (+$0.42 / +$5.30 / +$45.15).

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, standard library only).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's `sdk/makefun-bars.ts` shim.
- `LICENSE` — MIT.
