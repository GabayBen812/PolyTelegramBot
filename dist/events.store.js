import * as fs from "fs/promises";
const PATH = new URL("../events.json", import.meta.url).pathname;
export async function loadEvents() {
    try {
        return JSON.parse(await fs.readFile(PATH, "utf8"));
    }
    catch {
        return [];
    }
}
export async function saveEvents(evts) {
    await fs.writeFile(PATH, JSON.stringify(evts, null, 2));
}
export async function linkMarket(eventId, marketId) {
    const evts = await loadEvents();
    const e = evts.find(x => x.id === eventId);
    if (!e)
        throw new Error("event not found");
    if (!e.markets.includes(marketId))
        e.markets.push(marketId);
    await saveEvents(evts);
}
