# Binance ICO Bot

---

> WIP

> Do you own research and manage risk. Not responsible for any financial losses incurred when using this bot.

This bot to try take advantage on market volatility when new coin list on Binance. The idea is to buy the coin at a
reasonable price then instantly dump it to anyone unfortunate who are using market order.

It basically do the following:

1. Fetch a reference price at CoinMarketCap, if the coin are listed on DEX or other CEX

2. Create a LIMIT order to buy the new coin with all USDT in **spot wallet**

3. Wait until binance list

4. Send the buy order

5. Dump any brought coin to market

# How to start

0. Prepare your binance api token, secret and CMC's api token

1. Install packages `pnpm i`

2. Fill them in to `.env`

```
BINANCE_API_KEY=
BINANCE_API_SECRET=
CMC_API_KEY=
```

3. Create a trade `TODO`

4. Compile and run `pnpm build`, `pnpm start`
