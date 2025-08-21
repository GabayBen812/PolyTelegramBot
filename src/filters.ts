import { planBuys } from "./pmClient.js";
export async function planAndFilter(ids: string[], budget: number, opts?: {
  minLiquidity?: number; maxSlip?: number; maxSpread?: number;
}) {
  return planBuys(ids, budget, opts);
}
