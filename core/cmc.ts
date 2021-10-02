import axios, { AxiosInstance } from "axios"

interface IdMapResponse {
  data: Array<{
    id: string
    symbol: string
    is_active: number
  }>
}

interface QuoteResponse {
  data: {
    [id: string]: {
      id: string
      symbol: string
      quote: {
        [currency: string]: {
          price: number
        }
      }
    }
  }
}

export class CoinMarketCap {
  cmcIDMap?: Map<string, string>
  client: AxiosInstance

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: "https://pro-api.coinmarketcap.com/v1",
      headers: {
        "X-CMC_PRO_API_KEY": apiKey,
        Accept: "application/json",
      },
    })
  }

  async init(): Promise<void> {
    const response = await this.client.get<IdMapResponse>("/cryptocurrency/map")

    const mapping = response.data.data.reduce((acc, cur) => {
      if (cur.is_active) {
        acc.set(cur.symbol, cur.id)
      }
      return acc
    }, new Map())

    if (mapping.size === 0) {
      throw new Error("No active coins found")
    }

    this.cmcIDMap = mapping
  }

  async getPrice(symbol: string): Promise<number> {
    if (!this.cmcIDMap) {
      throw new Error("CoinMarketCap ID map not initialized")
    }

    const id = this.cmcIDMap.get(symbol.toUpperCase())

    if (!id) {
      throw new Error(`No coin with symbol ${symbol} found`)
    }

    const response = await this.client.get<QuoteResponse>(`/cryptocurrency/quotes/latest`, {
      params: {
        id: id,
      },
    })
    const quote = response.data.data[id]

    if (!quote || quote.symbol !== symbol) {
      throw new Error(`No coin with symbol ${symbol} found`)
    }

    const price = quote.quote?.USD?.price
    if (!price || price === 0) {
      throw new Error(`${symbol} do not have valid price`)
    }

    return price
  }
}
