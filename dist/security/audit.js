import fs from "fs";
import path from "path";
const dir = path.resolve("logs");
if (!fs.existsSync(dir))
    fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "audit.log");
export function audit(entry) {
    const safeEntry = { ...entry };
    // Ensure secrets like POLY_PRIVATE_KEY are never logged
    if ("POLY_PRIVATE_KEY" in safeEntry)
        delete safeEntry.POLY_PRIVATE_KEY;
    const line = JSON.stringify({ t: new Date().toISOString(), ...safeEntry }) + "\n";
    fs.appendFile(file, line, () => { });
}
