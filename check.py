import json

with open("espn_api_utf8.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for st in data.get("seasonTypes", []):
    for cat in st.get("categories", []):
        if "events" in cat and len(cat["events"]) > 0:
            print("Found events in seasonType:", st.get("displayName"))
            event = cat["events"][0]
            print("Event keys:", event.keys() if isinstance(event, dict) else type(event))
            print("Stats:", event.get("stats"))
            print("Labels:", cat.get("labels"))
            exit(0)
