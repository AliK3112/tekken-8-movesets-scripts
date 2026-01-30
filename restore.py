import json

# Hardcoded file paths
MOVESET_PATH = "path/to/moveset.json"
NAMEKEYS_PATH = "name_keys.json"

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    moveset = load_json(MOVESET_PATH)
    nameKeys = load_json(NAMEKEYS_PATH)

    print(moveset["tekken_character_name"])

    moves = moveset.get("moves", [])
    restored_count = 0

    for move in moves:
        name_key = str(move.get("name_key"))

        if name_key in nameKeys:
            correct_name = nameKeys[name_key]
            current_name = move.get("name")

            if current_name != correct_name:
                move["name"] = correct_name
                restored_count += 1
                print(f'Restored: {name_key} -> "{correct_name}"')

    print(f"\nTotal restored: {restored_count}")

    with open(MOVESET_PATH, "w", encoding="utf-8") as f:
        json.dump(moveset, f, indent=2)

if __name__ == "__main__":
    main()
