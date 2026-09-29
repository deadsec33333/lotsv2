# Every Element Is for Sale (frontend demo, v3)

A dark, crowded landing page where every one of its 165 elements is a separately owned slot: nav links, headline, images, buttons, section backgrounds, footer links. It works like notawebsite.fun, rebuilt for Solana / pump.fun.

It runs entirely in your browser. There is no backend, no database, no real wallet, no real payments and no blockchain. All owners, prices and activity are simulated.

## Open it on your Mac

1. Open the `Every Element Frontend` folder on your Desktop.
2. Double-click `Start local preview.command`.
3. Leave the Terminal window open. Open the address it prints, usually `http://127.0.0.1:5173`, in your browser.
4. To stop, click the Terminal window and press Control + C.

If macOS won't open the shortcut: open Terminal, paste `cd "$HOME/Desktop/Every Element Frontend"`, press Return, then run `npm install` (only the first time) and `npm run dev`.

## Our spin: everything is loose

- **Springs everywhere.** Every slot bobs gently on its own, trails behind when you scroll and bounces back into place (the same spring feel as the stockcoin site), tilts toward your mouse, and leans a little toward the cursor.
- **Grab and pull.** With a mouse you can drag any slot on a rubber band; let go and it snaps home with a wobble. A normal click still opens the slot card.
- **Takes knock things around.** When a slot is bought or taken it pops, and every slot near it gets knocked away and springs back.
- **SHAKE instead of shuffle.** The random button is now SHAKE THE PAGE: everything gets rattled, then lands in someone else's spot for 90 minutes.
- **Collectible foil.** Slots that keep getting taken level up: HOLO after 6 takes, GOLD after 10, with a moving foil ring.
- **Own look.** Dotted board background, sticker-yellow highlight, chrome buttons with a glint, rounded tiles, floating pill top bar and live bar, unclaimed slots shown as faded "ghost" template text, new wording.
- Motion turns off automatically if the visitor's device asks for reduced motion. On phones the springs are softer and only images bob.

## What you can do on the page

- **First visit box** explains Buy, Take and Decay. "Show me the cheapest slot" scrolls to it and opens it. The `?` button brings the box back.
- **Owner labels** sit above every element: wallet + OWNED, RENTABLE (lavender), RENTED, YOURS, or UNCLAIMED with its price.
- **Hover** a slot for a dashed outline and its number and price. **Click** it for the slot card: owner, price, take price, owner markup, takes, on-hover message, last sale, and the buttons.
- **Buy** an unclaimed slot at its price. **Take** an owned one for 1.4x; the previous owner is credited 1.15x. 15 minute cooldown between takes.
- When you own a slot: **Edit** (text, color, highlight, bold, italic, strike, underline, caps, box, size, link, hover message, images), **Set price** (0.1x to 4x), **List for rent**, **Upgrade** (text to link, image, background or video, "burning" $TICKER, 21 days).
- **Rent** a RENTABLE slot for 1 to 7 days and write in it while the owner keeps it.
- **Decay:** idle slots lose 10% of their price per week toward the floor.
- **SHAKE** button appears at random: the page rattles and owned slots swap contents for 90 minutes.
- **Bottom bar:** LIVE shows the latest event; INDEXER opens the full feed with filters.
- **Bottom right:** CLEAN VIEW hides all labels, HEAT colors slots by how often they were taken, USD / SOL switches every price.
- **BUY menu:** buy $TICKER on pump.fun, or jump to the cheapest slot. **BUILD menu:** build mode (every slot outlined with number and price), My slots, History, Timeline, Withdraw, Docs.
- **Footer pages:** History, Timeline, Docs, API (all slots as JSON), Withdraw (claim what you earned), My slots.
- Press **D** for demo controls: random event, 10 events, fill all, empty all, show SHAKE, end the shake, knock a random slot, skip a week, reset.

State is kept for this browser tab (session storage), so refreshing keeps your changes; closing the tab resets.

## Change names, prices and colors

Everything lives in `src/config.js`: project name, ticker, pump.fun link, X link, page views number, colors, and all economy numbers (floor price, 1.4x / 1.15x, cooldown, decay, markup range, rent rules, upgrade burn amounts, shuffle length, fake SOL price).

## Build the static website

```sh
npm run build
```

This creates `dist/`. `npm run preview` shows exactly that build. `npm test` runs the automated checks.

## Publish on Vercel later

1. Push this folder to your GitHub repository (without `node_modules` and `dist`).
2. In Vercel: Add New → Project → import the repository.
3. Confirm Framework Preset **Vite**, Build Command `npm run build`, Output Directory `dist`. No environment variables.
4. Deploy.

## File guide

- `index.html`: page entry, fonts, favicon.
- `src/config.js`: names, links, colors, economy numbers, wording.
- `src/layout.js`: the 165 slots in page order with their default (unclaimed) content.
- `src/seed.js`: invented starting owners and what they wrote.
- `src/art.js`: generated pixel avatars, icons, logos and poster images.
- `src/data.js`: the fake "chain": prices, buy, take, edit, markup, rent, upgrade, shuffle, withdraw, decay, simulation, saving.
- `src/main.js`: the page, slot cards, editor, pages, ticker, indexer, controls.
- `src/motion.js`: all the spring physics (jelly scroll, hover tilt, drag, knocks, shake).
- `src/styles.css`: the whole look, desktop and phone.
- `tests/data.test.js`: checks for all the economy rules.
- `public/favicon.svg`: tab icon.

## Connecting real Solana later

Replace the functions in `src/data.js` with calls to a Solana program (or backend + program): it must own slot state, prices, takes and cooldowns atomically, credit payouts, and store content hashes. Swap the fake Connect Wallet for the Solana wallet adapter. Store images/videos in object storage and add moderation. The UI only talks to `data.js`, so it mostly stays as is.
