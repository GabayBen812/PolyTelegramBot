#!/usr/bin/env python3
# Fetch latest Telegram updates and print chat_id / user_id.
# Uses TELEGRAM_BOT_TOKEN from env, or reads .env in CWD, or --token.

import os, sys, json, urllib.parse, urllib.request, pathlib

def load_token():
    # 1) env
    t = os.getenv("TELEGRAM_BOT_TOKEN")
    if t: return t.strip()

    # 2) .env file (very simple parser)
    env_path = pathlib.Path(".env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.strip().startswith("TELEGRAM_BOT_TOKEN="):
                return line.split("=", 1)[1].strip()

    # 3) --token CLI
    if len(sys.argv) >= 3 and sys.argv[1] == "--token":
        return sys.argv[2].strip()

    print("ERROR: TELEGRAM_BOT_TOKEN not found. Set env, put in .env, or pass --token <TOKEN>.")
    sys.exit(1)

def api_get(token: str, method: str, params: dict | None = None):
    base = f"https://api.telegram.org/bot{token}/{method}"
    if params:
        base += "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(base) as r:
        return json.loads(r.read().decode("utf-8"))

def main():
    token = load_token()

    # optional flags
    if "--delete-webhook" in sys.argv:
        r = api_get(token, "deleteWebhook")
        print("deleteWebhook:", r.get("ok"), r.get("description", ""))
        # Tip: send a new message in the group now, then re-run without this flag.

    # pull last few message updates
    r = api_get(token, "getUpdates", {
        "allowed_updates": "message",
        "limit": 10
    })
    result = r.get("result", [])
    if not result:
        print("No updates. Send a message in the group and run again.")
        sys.exit(0)

    print("Last messages (newest last):")
    for u in result[-10:]:
        msg = u.get("message") or {}
        chat = msg.get("chat") or {}
        frm  = msg.get("from") or {}
        print(
            f"chat_id={chat.get('id')}  "
            f"title={chat.get('title') or chat.get('username')}  "
            f"user_id={frm.get('id')}  username={frm.get('username')}  "
            f"text={msg.get('text')!r}"
        )

if __name__ == "__main__":
    main()