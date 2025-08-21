import * as fs from "fs/promises";
import { EventDef } from "./types.js";
const PATH = new URL("../events.json", import.meta.url).pathname;

export async function loadEvents(): Promise<EventDef[]> {
  try { return JSON.parse(await fs.readFile(PATH, "utf8")); }
  catch { return []; }
}
export async function saveEvents(evts: EventDef[]) {
  await fs.writeFile(PATH, JSON.stringify(evts, null, 2));
}
export async function linkMarket(eventId: string, marketId: string) {
  const evts = await loadEvents();
  const e = evts.find(x => x.id === eventId);
  if (!e) throw new Error("event not found");
  if (!e.markets.includes(marketId)) e.markets.push(marketId);
  await saveEvents(evts);
}
