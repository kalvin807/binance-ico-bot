import Binance from "binance-api-node"
import type { Binance as BinanceClient } from "binance-api-node"

export function createBinanceClient(
  key: string,
  secret: string,
): BinanceClient {
  return Binance({
    apiKey: key,
    apiSecret: secret,
  })
}
