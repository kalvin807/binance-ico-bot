import "dotenv/config"
import { addMinutes } from "date-fns"

import { createBinanceClient } from "./core/binance"
import { CoinMarketCap } from "./core/cmc"
import { TradeRunner } from "./services/trade-runner"

async function main() {
  const binanceApiKey = process.env.BINANCE_API_KEY
  const binanceApiSecret = process.env.BINANCE_API_SECRET
  const cmcApiKey = process.env.CMC_API_KEY

  if (!binanceApiKey || !binanceApiSecret || !cmcApiKey) {
    console.error("API key and secret are required")
    process.exit(1)
  }

  const binance = createBinanceClient(binanceApiKey, binanceApiSecret)

  const isUp = await binance.ping()

  if (!isUp) {
    console.error("Binance api server is down")
    process.exit(1)
  } else {
    const serverTime = await binance.time()
    console.info(`Binance api ping: ${Date.now() - serverTime}ms`)
  }

  const cmc = new CoinMarketCap(cmcApiKey)
  await cmc.init()

  const runner = new TradeRunner(binance, cmc, true)

  const TestTrade = {
    coin: "BTC",
    startTime: addMinutes(new Date(), 1),
  }

  await runner.runICOBot(TestTrade)
}

main()
