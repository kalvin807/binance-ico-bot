import { Binance as BinanceClient, NewOrderSpot, Order, OrderSide, OrderType } from "binance-api-node"

import { CoinMarketCap } from "../core/cmc"

interface ScheduledICO {
  coin: string
  startTime: Date
}

export class TradeRunner {
  binance: BinanceClient
  cmc: CoinMarketCap
  isTest: boolean

  constructor(binance: BinanceClient, cmc: CoinMarketCap, isTest = false) {
    this.binance = binance
    this.cmc = cmc
    this.isTest = isTest
  }

  async getSpotUSDTBalance(): Promise<number> {
    const accountInfo = await this.binance.accountInfo()
    const usdt = accountInfo.balances.find((asset) => asset.asset === "USDT")

    if (!usdt || !Number(usdt.free) || Number(usdt.free) <= 0) {
      throw new Error("No USDT balance found")
    }

    return Number(usdt.free)
  }

  planTrades(ico: ScheduledICO, refPrice: number, buyingPower: number): NewOrderSpot[] {
    const usingPower = buyingPower * 0.99 // 1% for fees
    const spreadPrice = refPrice * 1.01 // 1% spread
    const amount = usingPower / spreadPrice
    const order: NewOrderSpot = {
      symbol: `${ico.coin}USDT`,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      quantity: amount.toFixed(2),
      price: spreadPrice.toFixed(2),
      newOrderRespType: "RESULT",
    }

    return [order]
  }

  async execute(instruction: NewOrderSpot): Promise<Order> {
    return this.isTest ? this.binance.orderTest(instruction) : this.binance.order(instruction)
  }

  async go(instruction: NewOrderSpot): Promise<void> {
    // We use serial execution, buy, check if filled, then sell
    const buyResponse = await this.execute(instruction)
    /**
     * Core trading logic
     */
    console.log(buyResponse)
    const { status } = buyResponse
    // Case 1: Order is reject -> Throw
    if (status === "CANCELED" || status === "REJECTED") {
      throw new Error(`Order ${status}`)
    }
    // Case 2: Order is 100% filled -> Dump it
    if (status === "FILLED") {
      const sellOrder: NewOrderSpot = {
        symbol: buyResponse.symbol,
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: buyResponse.executedQty,
        newOrderRespType: "RESULT",
      }
      const result = await this.execute(sellOrder)
      console.log(result)
    }

    if (status === "PARTIALLY_FILLED" || status === "NEW") {
      let soldCoin = Number(buyResponse.executedQty)
      const t0 = new Date()
      while (soldCoin !== Number(buyResponse.origQty)) {
        if (new Date().getTime() - t0.getTime() > 1000 * 60) {
          throw new Error("Timeout when selling remaining asset")
        }
        const status = await this.binance.getOrder({
          orderId: buyResponse.orderId,
          symbol: buyResponse.symbol,
        })
        if (status.status === "FILLED" || status.status === "PARTIALLY_FILLED") {
          const canSell = Number(status.executedQty) - soldCoin

          const sellOrder: NewOrderSpot = {
            symbol: buyResponse.symbol,
            side: OrderSide.SELL,
            type: OrderType.MARKET,
            quantity: canSell.toString(),
            newOrderRespType: "RESULT",
          }

          const sellResult = await this.execute(sellOrder)
          soldCoin += Number(sellResult.executedQty)

          // Small sleep
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    }
  }

  async runICOBot(ico: ScheduledICO): Promise<void> {
    try {
      // Get reference price from coinmarketcap
      const refPrice = await this.cmc.getPrice(ico.coin)
      // Get current available balance
      const availableUSDT = await this.getSpotUSDTBalance()
      // Plan trades
      const instructions = this.planTrades(ico, refPrice, availableUSDT)

      console.log(`SET to TRADE ${ico.coin}@${refPrice} with ${availableUSDT}USDT`)
      // Sleep until start time
      const sleepUntil = ico.startTime.getTime() - Date.now()
      if (sleepUntil > 0) {
        console.log(`Sleeping ${sleepUntil}ms until ${ico.startTime}`)
        await new Promise((resolve) => setTimeout(resolve, sleepUntil))
      }
      // Execute trades
      const res = await Promise.all(instructions.map((instruction) => this.go(instruction)))
      console.log(res)
    } catch (e) {
      console.warn("Error when running ICO bot", e)
    }
  }
}
