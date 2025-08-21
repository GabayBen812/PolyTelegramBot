import { Telegraf } from "telegraf";
import { loadEvents, linkMarket } from "./events.store.js";
import { planAndFilter } from "./filters.js";
import { getPending, setPending, clearPending } from "./security/pending.js";
import { audit } from "./security/audit.js";
import { executeBuys } from "./pmClient.js";
const token = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new Telegraf(token);
bot.catch(async (err, ctx) => {
    console.error("Bot handler error:", err);
    try {
        await ctx.reply("Error processing command.");
    }
    catch { }
});
bot.command("whoami", async (ctx) => {
    const username = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name ?? "");
    return ctx.reply(`chat_id=${ctx.chat?.id}\nuser_id=${ctx.from?.id}\nusername=${username}`);
});
bot.command("events", async (ctx) => {
    const evts = await loadEvents();
    if (!evts.length)
        return ctx.reply("No events defined.");
    ctx.reply(evts.map(e => `• ${e.id}: ${e.name} (${e.markets.length} markets)`).join("\n"));
});
bot.command("link", async (ctx) => {
    const [, eventId, marketId] = ctx.message.text.split(/\s+/);
    if (!eventId || !marketId)
        return ctx.reply("Usage: /link <eventId> <marketId>");
    await linkMarket(eventId, marketId);
    ctx.reply(`Linked ${marketId} to ${eventId}`);
});
bot.command("orderbooks", async (ctx) => {
    const [, eventId] = ctx.message.text.split(/\s+/);
    const ev = (await loadEvents()).find(e => e.id === eventId);
    if (!ev)
        return ctx.reply("Unknown event");
    const plans = await planAndFilter(ev.markets, Number(process.env.DEFAULT_BUDGET_USDC ?? 50));
    ctx.reply(plans.map(p => p.skip
        ? `❌ ${p.id} skipped (${p.skip})`
        : `✅ ${p.id} depth ok | est spend $${(p.spent ?? 0).toFixed(2)} avg ${(p.avgPrice ?? 0).toFixed(3)}`).join("\n"));
});
// Ensure /orderbooks triggers even with bot mention (e.g. /orderbooks@BotName) or when command parsing fails
bot.hears(/^\/orderbooks(?:@\w+)?(?:\s+|$)/i, async (ctx) => {
    const text = ctx.message?.text;
    const [, eventId] = (text ?? "").split(/\s+/);
    const ev = (await loadEvents()).find(e => e.id === eventId);
    if (!ev)
        return ctx.reply("Unknown event");
    const plans = await planAndFilter(ev.markets, Number(process.env.DEFAULT_BUDGET_USDC ?? 50));
    return ctx.reply(plans.map(p => p.skip
        ? `❌ ${p.id} skipped (${p.skip})`
        : `✅ ${p.id} depth ok | est spend $${(p.spent ?? 0).toFixed(2)} avg ${(p.avgPrice ?? 0).toFixed(3)}`).join("\n"));
});
bot.command("buy", async (ctx) => {
    const m = ctx.message.text.match(/\/buy\s+(\S+)(?:\s+(\d+))?(.*)/);
    if (!m)
        return ctx.reply("Usage: /buy <eventId> [budget] [--dry]");
    const [, eventId, budgetRaw, flags] = m;
    const dry = flags?.includes("--dry") ?? true;
    const budget = Number(budgetRaw ?? process.env.DEFAULT_BUDGET_USDC ?? 50);
    const cap = Number(process.env.MAX_BUDGET_PER_BUY ?? 200);
    if (budget > cap) {
        await ctx.reply(`Budget exceeds cap (${cap}).`);
        return;
    }
    const ev = (await loadEvents()).find(e => e.id === eventId);
    if (!ev)
        return ctx.reply("Unknown event");
    const plans = await planAndFilter(ev.markets, budget, ev.buyRules);
    const buyable = plans.filter((p) => !p.skip);
    if (!buyable.length) {
        audit({ kind: "buy_plan", outcome: "SKIPPED", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username, budget, reason: "no_buyable" });
        return ctx.reply("Nothing passes filters.");
    }
    const safeMode = String(process.env.SAFE_MODE ?? "true").toLowerCase() === "true";
    const planSummary = buyable.map((p) => ({ id: p.id, spent: p.spent })).slice(0, Number(process.env.MAX_MARKETS_PER_BUY ?? 10));
    setPending(ctx.chat.id, { buyable: planSummary, budget, eventId });
    const baseMsg = "PLAN:\n" + planSummary.map((p) => `→ ${p.id} ~$${(p.spent ?? 0).toFixed(2)}`).join("\n");
    if (safeMode || dry) {
        audit({ kind: "buy_plan", outcome: "DRY", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username, budget, planSummary });
        return ctx.reply(baseMsg + "\nPending confirm.");
    }
    // Not safe mode and not dry: execute immediately
    try {
        const res = await executeBuys(planSummary.map(({ id, spent }) => ({ id, spent })));
        audit({ kind: "buy_execute", outcome: "EXECUTED", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username, budget, totals: { markets: planSummary.length, spent: planSummary.reduce((a, b) => a + (b.spent ?? 0), 0) } });
        return ctx.reply("Executed.");
    }
    catch (e) {
        audit({ kind: "buy_execute", outcome: "ERROR", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username, error: String(e?.message ?? e) });
        return ctx.reply("Execution failed.");
    }
});
bot.command("confirm", async (ctx) => {
    const plan = getPending(ctx.chat.id);
    if (!plan)
        return ctx.reply("No pending plan.");
    clearPending(ctx.chat.id);
    try {
        const res = await executeBuys(plan.buyable.map(({ id, spent }) => ({ id, spent })));
        audit({ kind: "buy_execute", outcome: "EXECUTED", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username, totals: { markets: plan.buyable.length, spent: plan.buyable.reduce((a, b) => a + (b.spent ?? 0), 0) } });
        return ctx.reply("Executed.");
    }
    catch (e) {
        audit({ kind: "buy_execute", outcome: "ERROR", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username, error: String(e?.message ?? e) });
        return ctx.reply("Execution failed.");
    }
});
bot.command("cancel", async (ctx) => {
    clearPending(ctx.chat.id);
    audit({ kind: "buy_cancel", chat: ctx.chat?.id, user: ctx.from?.id, username: ctx.from?.username });
    return ctx.reply("Canceled.");
});
bot.command("help", async (ctx) => {
    return ctx.reply([
        "/whoami — show chat/user ids",
        "/events — list events",
        "/link <eventId> <marketId> — link event to market",
        "/orderbooks <eventId> — show depth for an event",
        "/buy <eventId> [budget] [--dry] — plan a buy",
        "/confirm — execute last plan",
        "/cancel — discard last plan",
        "/ping — liveness"
    ].join("\n"));
});
bot.command("ping", async (ctx) => ctx.reply("pong"));
// Unknown command fallback: reply help for slash-commands
bot.on("text", async (ctx) => {
    const text = ctx.message?.text;
    if (text && text.startsWith("/")) {
        return ctx.reply("Unknown command. Try /help");
    }
});
