import "dotenv/config";
import { bot } from "./bot.js";
import { authGuard } from "./security/auth.js";
import { audit } from "./security/audit.js";
bot.use(authGuard);
(async () => {
    audit({ event: "service_start" });
    try {
        await bot.telegram.setMyCommands([
            { command: 'whoami', description: 'show chat/user ids' },
            { command: 'events', description: 'list events' },
            { command: 'link', description: 'link event to market' },
            { command: 'orderbooks', description: 'show depth for an event' },
            { command: 'buy', description: 'plan a buy' },
            { command: 'confirm', description: 'execute last plan' },
            { command: 'cancel', description: 'discard last plan' },
            { command: 'help', description: 'show bot help' },
        ]);
    }
    catch (e) {
        console.warn('setMyCommands failed:', e);
    }
    await bot.launch();
    process.once("SIGINT", () => {
        audit({ event: "service_stop", signal: "SIGINT" });
        bot.stop("SIGINT");
    });
    process.once("SIGTERM", () => {
        audit({ event: "service_stop", signal: "SIGTERM" });
        bot.stop("SIGTERM");
    });
})();
