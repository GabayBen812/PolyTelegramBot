/** TODO: החלף מימוש ל-SDK הרשמי של Polymarket */
export async function getOrderBook(marketId) {
    // Placeholder — שלוף מממשק ה-CLOB/GraphQL הרשמי של Polymarket.
    // החזר asks/bids ממוינים לפי מחיר.
    throw new Error("Wire Polymarket SDK/API here");
}
export async function planBuys(marketIds, budgetUSDC, f = {}) {
    const plans = [];
    for (const id of marketIds) {
        const ob = await getOrderBook(id);
        const topAsk = ob.asks[0]?.price, topBid = ob.bids[0]?.price;
        const spread = (topAsk ?? 1) - (topBid ?? 0);
        if (f.maxSpread && spread > f.maxSpread) {
            plans.push({ id, skip: "spread" });
            continue;
        }
        // עומק: סכום כמויות עד תקציב
        let spent = 0, shares = 0;
        for (const lvl of ob.asks) {
            const take = Math.min(lvl.size, (budgetUSDC - spent) / lvl.price);
            spent += take * lvl.price;
            shares += take;
            if (spent >= budgetUSDC)
                break;
        }
        if (f.minLiquidity && spent < f.minLiquidity) {
            plans.push({ id, skip: "liquidity" });
            continue;
        }
        plans.push({ id, spent, avgPrice: spent / Math.max(shares, 1e-9), shares });
    }
    return plans;
}
export async function executeBuys(plans) {
    // TODO: החלף לקריאות SDK אמיתיות (חתימה עם POLY_PRIVATE_KEY, ארנק ממומן ב-USDC).
    // החזר tx hashes/ordIds.
    throw new Error("Wire Polymarket trading SDK here");
}
