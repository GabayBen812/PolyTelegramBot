const allowedGroup = Number(process.env.ALLOWED_GROUP_ID ?? 0);
const allowedUsers = new Set((process.env.ALLOWED_USER_IDS ?? "")
    .split(",").filter(Boolean).map((s) => Number(s)));
export const isAuthorized = (ctx) => !!ctx.chat && !!ctx.from &&
    ctx.chat.id === allowedGroup && allowedUsers.has(ctx.from.id);
export const authGuard = async (ctx, next) => {
    if (isAuthorized(ctx))
        return next();
    const msg = ctx.message ?? {};
    if ("text" in msg && String(msg.text).startsWith("/")) {
        await ctx.reply("Not authorized.");
    }
    return;
};
