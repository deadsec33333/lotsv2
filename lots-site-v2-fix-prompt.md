# Prompt for GPT: rework the "every element is for sale" site (v2)

You already built this project (Vite + vanilla JS, files: `src/config.js`, `src/data.js`, `src/main.js`, `src/styles.css`, `tests/data.test.js`). **Keep the project and file structure, keep it frontend only** (no backend, no real wallet, no real payments, fake data, deploys to Vercel as static `dist`). Keep the data module API, session storage, the `D` demo panel and the tests, and update them for the new rules below.

The current version looks like a polished, light, clean SaaS template. **That is wrong.** The target is a site that looks like a normal landing page **that has already been taken over by hundreds of owners**: dark, dense, loud, messy, with an owner label on every single element. Rework the look, the layout and the economy as described here. Write all copy and seed content yourself, do not copy text, images or code from any existing site.

Before coding, give me a short list of what you will change in each file. Then do it.

---

## 1. Look (the biggest change)

- **Dark theme only.** Page background `#0E0E0C`. Alternate full-width bands in `#1A1A17`. Card background `#1A1A17` with 1px border `#2B2A26`. Main text `#F4F1EA`, muted text `#8F897B`. Put all of this in config.
- **Fonts:** `Inter Tight` (Google Fonts) for content, `JetBrains Mono` for every system label (tags, badges, buttons of the system UI, ticker, modal labels). System labels are UPPERCASE with wide letter spacing (0.1em to 0.25em), 8 to 12px.
- **Headline:** Inter Tight 800, about 56px on desktop, letter spacing about -0.03em, tight line height.
- **Remove** the soft pastel cards, the globe illustrations, rounded "friendly" style, the sticker, the numbered section eyebrows ("01 / THE NEIGHBORS" etc.). Corners are square or 2px at most. No shadows.
- **Owner labels always visible.** Directly above the top-left corner of EVERY slot, show a tiny mono label: the owner's short wallet (`7xKq…9fPa`, 9 to 10px, muted color) followed by a badge:
  - `OWNED`: 8px mono, white text, no background
  - `RENTABLE`: 8px mono, black text on lavender `#D8B4FE`, padding 1px 3px
  - unclaimed slots: label shows `UNCLAIMED` and the floor price
  These labels are what makes the page look like a map of owners. They overlap content a bit, that's fine and intended.
- **Owners style their own content.** Each text slot stores a style chosen by its owner, and the seed data must use lots of them mixed together:
  - highlight chip: black bold text on neon lime `#CCFF00`
  - colored text (orange, pink, purple, red, green, yellow), optional gradient text
  - bold / italic / strikethrough / UPPERCASE / underline
  - size: small, normal, large, display
  - emoji allowed
  Add these controls to the slot editor.
- The page must look **crowded and chaotic**: about 90% of slots pre-filled by invented owners with shilling, jokes, token tickers, fake links, "rent this ad space" type content, a few long rambling text blocks. Keep seed content clean: no slurs, no insults at real people, no adult content, no real brands.
- Unclaimed or empty image slots show a dark diagonal hatch pattern with a centered mono label like `THIS IMAGE IS FOR SALE TOO`.

## 2. Layout (top to bottom, single centered column about 1260px wide)

1. **Top bar** (thin, dark): small logo mark + wordmark slot on the left; on the right `BUY ▾` (white button: Buy $TICKER on pump.fun / Buy the cheapest slot), `BUILD ▾` (Build mode, Builder, My slots, History), `?`, `X`.
2. **Announcement strip** (band `#1A1A17`): 2 rows of short slots in different styles, e.g. a colored shout, a lime chip, a "@handle 6 WEEKS" style chip.
3. **Nav row:** many small slots side by side: token tickers in lime chips, small square icon tiles, a boxed text slot, a "Connect Wallet" that is itself a slot, plus the real Connect Wallet button on the far right.
4. **Hero** (2 columns): left = small eyebrow line slot, a second small lime tag slot, the huge headline slot (default: "Your ad here. X page views per 7d rolling."), a strikethrough lime chip slot, a white primary button slot + a small lime chip next to it, a tiny uppercase line slot. Right = large image slot with hatch placeholder.
5. **Band:** a colored uppercase line slot ("ADVERTISE YOUR PROJECT HERE!") and a row of 6 image tiles (pixel-art avatars, generated locally).
6. **Testimonials:** a small colored line slot, a big centered orange/yellow display line slot, then 4 dark cards in a row. Each card: icon slot, name slot, a long text body slot.
7. **Buyable section** (2 columns): left = list with bullets of short styled slots, a boxed wide slot, and a big image ad slot; right = a long highlighted rambling text slot and a "rent this ad space" block with a small price list (1 day / 3 days / 7 days) and a boxed `DM HERE` button slot.
8. **Stats band:** 4 huge display numbers/words (e.g. live `165` + "BUYABLE ELEMENTS", and 3 owner-filled ones), each with a small mono caption slot.
9. **Features:** an arrow line slot, then a 2×3 grid of dark cards. Each card: small colored title, icon + name, mono subtitle.
10. **Pricing tiers:** 3 cards side by side: tier name slot, big display price slot, blurb slot, 3 bulleted feature line slots, a boxed button slot. The middle card has a white border and a white filled button.
11. **Logo strip band:** 12 grey boxes, empty ones say "You can buy this logo."
12. **FAQ:** narrow centered column, each question + answer is a slot, thin dividers, owners have overwritten most of them with loud styled text.
13. **Big ad block:** centered huge gradient display word slot, a link slot, a small red button slot.
14. **Footer band:** 5 columns of small styled link slots.
15. **Bottom footer row:** `PROJECT_NAME · MAINNET` on the left; `HISTORY TIMELINE X DOCS API BUILDER DEMOS WITHDRAW MY SLOTS` on the right, mono, small.

Target: **165 slots** total, config driven. The section backgrounds are slots too (owner can set a background color/image).

## 3. Fixed UI on top of the page

- **Bottom ticker bar** (fixed, full width, 34px, black): left `● LIVE` then the latest event (`Slot #78 repriced by 7xKq…9fPa · just now`), right `INDEXER`. Clicking INDEXER opens a drawer with the full activity feed.
- **Floating controls** (fixed, bottom right, above the ticker): `?` box, a `CLEAN VIEW` switch (hides all owner labels and outlines), a `HEAT` toggle, and under them a `USD | SOL` segmented switch that changes every displayed price.
- **First visit modal** (show once per session, dark card, mono labels):
  - label `FIRST TIME HERE?`, big bold title, one paragraph explaining every element is a separately owned slot
  - three rules, each with a thin left border: **Buy**, **Take**, **Decay** (numbers from config)
  - footer: `READ THE DOCS` (link), `GOT IT` (close), `SHOW ME THE CHEAPEST SLOT` (white button: closes, scrolls to the cheapest slot and flashes it)
- **Hover:** dashed 1px outline around the slot and a small price chip at its top-right corner.
- **Slot card** (opens on click, dark popover next to the slot, mono): header = slot path like `TESTIMONIALS.2.ROLE`; rows `OWNER`, `PRICE`, `TAKE PRICE`, `OWNER MARKUP`, `TAKES`, `ON HOVER`, `LAST SALE`; buttons stacked full width: `RENT IT` (only if rentable), `TAKE` or `BUY` (white, primary), `SHARE CARD`, `TRADE $TICKER`. TAKE/BUY/RENT open the editor (bottom sheet on mobile).

## 4. Economy (replace the rent-only model)

Prices in SOL (config), shown in SOL or USD via a fake rate.

- **Buy:** an unclaimed slot costs its current price, starting at a floor (e.g. 0.01 SOL) and higher for more valuable slots (nav and hero cost the most).
- **Edit:** only the current owner can change content.
- **Take:** anyone can take an owned slot for **1.4×** its current price. The previous owner is credited **1.15×** (being taken is a profit), 5% to creator, rest to treasury. 15 minute cooldown per slot. After a take the price becomes the take price.
- **Owner markup:** owner can set their asking price between 0.1× and 4× the formula price. Resets when the slot changes hands.
- **Decay:** idle slots lose 10% of their price per week toward the floor, max 52 weeks. Simulate by giving seed slots different "last activity" dates.
- **Rent:** an owner can list their slot at a daily rate (floor 0.25% of price per day), tenant writes the content for up to 7 days, protocol takes 35%.
- **Upgrades:** turn a text slot into link / image / background / video by burning $TICKER (amounts in config), lasts 21 days. Image needs the slot to be at least 160×32, video 320×180.
- **Shuffle:** a button that appears at random (and in the D panel): all owned slots swap contents in pairs for 90 minutes, then snap back. Only owned slots take part.
- **Withdraw page:** shows the session wallet's claimable balance from being taken/rent, with a fake Claim button.
- **Docs page:** explains all rules above in plain words.

Update `data.js` (`getSlots`, `buySlot`, `takeSlot`, `rentSlot`, `setMarkup`, `upgradeSlot`, `shuffle`, `getBalance`) and the tests for these rules. The simulation keeps generating buys, takes, reprices and rentals every 10 to 20 seconds, each shown in the ticker bar.

## 5. Mobile

Single column, everything stacks, owner labels stay visible (can shrink to 8px), ticker bar and floating controls stay fixed, slot card and editor become a bottom sheet, first-visit modal fits the screen.

## 6. When you are done

1. List what changed in each file
2. Run `npm test` and `npm run build` and tell me the result
3. Remind me how to open the local preview
