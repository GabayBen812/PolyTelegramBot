import "dotenv/config";
import { bot } from "./bot.js";
import { authGuard } from "./security/auth.js";
import { audit } from "./security/audit.js";
bot.use(authGuard);
audit({ event: "service_start" });
bot.launch();
process.once("SIGINT", () => {
    audit({ event: "service_stop", signal: "SIGINT" });
    bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
    audit({ event: "service_stop", signal: "SIGTERM" });
    bot.stop("SIGTERM");
});
