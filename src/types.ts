export type EventId = string;
export type MarketId = string;

export interface EventDef {
  id: EventId;
  name: string;
  synonyms?: string[];
  markets: MarketId[];
  buyRules?: {
    maxSlip?: number;       // 0.01 = 1%
    minLiquidity?: number;  // מינימום עומק ב-USDC
    maxSpread?: number;     // מקס' מרווח בין bid/ask
  };
}

export interface OrderBookLevel { price: number; size: number; } // USDC, shares
export interface OrderBook { asks: OrderBookLevel[]; bids: OrderBookLevel[]; }
