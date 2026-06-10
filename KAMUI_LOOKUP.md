# `kamui_lookup` — Kamui-Hash Preimage Recovery

Recover the original string(s) for a Kamui hash used in Tekken 8 movesets. Given a
32-bit hash (and optionally what you know about the string — its length, prefix,
suffix, or a substring), it lists every string that produces that hash.

```bash
node kamui_lookup.js <hash> [options]
```

`<hash>` is hex (`0x53b37469`) or decimal (`1404269673`).

---

## Quick start

```bash
# You know the length and the start of the name
node kamui_lookup.js 0xf2c6de5a --len 11 --prefix Kt_

# You only know how it ends
node kamui_lookup.js 0x53b37469 --len 9 --suffix _y

# You know both ends — usually pins it down to one answer
node kamui_lookup.js 0x2ef33bb2 --len 12 --prefix SE_ --suffix _000
```

---

## How it works (and why it's reliable)

For string lengths **5–12** the hash reads exactly three 32-bit words from the
string: `w0` (start), `wMid` (middle), and `wEnd` (end). Every step of the hash is
invertible, which means **any one of the three words is uniquely determined by the
other two**.

So the lookup doesn't brute-force and doesn't rely on a dictionary. It:

1. Picks the cheapest word to *derive*.
2. Enumerates the free bytes of the other two words over the full charset
   (`A-Za-z0-9_`), constrained by your `--prefix` / `--suffix`.
3. Solves the third word analytically and verifies by re-hashing.

When the enumeration fits under the iteration cap, the search is **exhaustive** —
it cannot miss a valid string, and it never reports a false positive (every result
is hash-verified).

> Lengths **13–24** use a different internal path (`computeKamuiHash12To24`) with
> meet-in-the-middle / analytic helpers (`--analytic` is implemented for len 14).

---

## Options

| Option | Description |
|--------|-------------|
| `--len N` | String length. `5–12` (medium path) or `13–24`. Default `12`. |
| `--prefix STR` | Known start of the name (e.g. `Kt_`, `sDm_`, `SE_CHECK_`). |
| `--suffix STR` | Known end of the name (e.g. `_y`, `_n`, `_000`). |
| `--contains STR` | Result must contain this substring. |
| `--max N` | Show up to N candidates (default `100`). Also `-m N` or `--max=N`. |
| `--all` | List every candidate found (no display cap). |
| `--max-iter N` | Len 5–12: cap on analytic enumeration (default `2e8`). Raise it for prefix-only / suffix-only searches on longer strings. |
| `--uppercase-only` | Restrict the charset to `A-Z0-9_`. |
| `--format` | Add Tekken token fragments to the corpus (len 12 only). |
| `--deep` | Full tail-word brute (len 5–12: `wEnd`; len 13–24: `w2`). |
| `--pair-w2` | Brute `w2` for top co-occurring pairs from the corpus (len 12–24). |
| `--analytic` | Len 14 only: corpus-free inversion + MITM (slow). |
| `--max-w2 N` | With `--analytic`: cap the `w2` scan count. |
| `--w2-offset N` | With `--analytic`: resume from `w2` index N. |
| `--analytic-verbose` | Progress lines on stderr during `--analytic`. |
| `--json` | Emit JSON instead of the text report. |
| `-h`, `--help` | Show usage. |

---

## Reading the output

```
Target hash: 0x53b37469 (1404269673)
String length: 9
Charset: 63 chars (A-Za-z0-9_ default)
Constraints: suffix="_y"

Complete analytic search: exhaustive (derived w0, 3 free bytes enumerated).
Total preimages found: 954
Showing: 100 (cap --max 100)

zangetu_y
...
```

- **`Complete analytic search: exhaustive`** — the result set is guaranteed
  complete for your constraints. The real string is in the list.
- **`Total preimages found`** — how many strings hash to this value under your
  constraints. Multiple strings can legitimately share one hash (collisions);
  use a longer prefix/suffix to narrow down.

### When the search is capped

If the needed enumeration is larger than `--max-iter`, you'll see:

```
NOTE: full analytic search needs ~992,436,543 iterations (5 free bytes) - above the
default cap, so results below are corpus-assisted and NOT exhaustive.
      For a guaranteed-complete search, re-run with: --max-iter 992436543
```

This is the honest signal that "no candidates" means "search was capped," **not**
"the string doesn't exist." Re-run with the suggested `--max-iter` for a complete
search:

```bash
node kamui_lookup.js 0x131dbc22 --len 11 --prefix It_ --max-iter 992436543
```

---

## Tips for finding things reliably

- **Give both a prefix and a suffix when you can.** Each pinned byte cuts the
  search by ~63×. Prefix + suffix usually makes the search instant and exhaustive.
- **A suffix alone is often enough.** Tekken reaction/throw names commonly end in
  `_y` or `_n`; deriving the start word means you only enumerate the middle.
- **Cost rule of thumb:** the search enumerates `63^(free bytes)` combinations.
  ~`63^4` (≈16M) is fast; `63^5` (≈992M) takes ~40s with `--max-iter` raised;
  `63^6+` needs more constraints.
- **More candidates is fine, missing the answer is not.** It's safe to get
  thousands of results — the correct string is guaranteed to be among them when the
  run is exhaustive.

---

## Examples

```bash
# Length 11, known start — exhaustive, instant
node kamui_lookup.js 0xcacfbe51 --len 11 --prefix Hw_     # -> Hw_RF_WK_LF

# Length 9, known end only — derives the start word
node kamui_lookup.js 0x53b37469 --len 9 --suffix _y       # -> zangetu_y (among results)

# Length 12, both ends — typically a single answer
node kamui_lookup.js 0x2ef33bb2 --len 12 --prefix SE_CHECK_   # -> SE_CHECK_000

# Prefix-only on a longer string — raise the cap for a complete search
node kamui_lookup.js 0x131dbc22 --len 11 --prefix It_ --max-iter 1000000000

# Length 14 story/throw names (separate analytic path)
node kamui_lookup.js 0xcf9a85a6 --len 14 --analytic --prefix Esc_Jz_front --suffix _n

# Machine-readable output
node kamui_lookup.js 0xf2c6de5a --len 11 --prefix Kt_ --json
```

---

## Verifying a guess

To check a candidate string yourself, hash it directly:

```bash
node hash.js zangetu_y      # -> 0x53b37469
```
