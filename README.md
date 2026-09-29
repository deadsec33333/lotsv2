# Every Element Is for Sale — frontend demo

A Vite + vanilla JavaScript website. It runs entirely in your browser: no backend, database, API requests, real wallet, blockchain reads, or payments. Nothing has been published.

## Open it on your Mac

1. Open the `Every Element Frontend` folder on your Desktop.
2. Double-click `Start local preview.command`.
3. Leave the Terminal window open while using the website. The script prints the local address, usually `http://127.0.0.1:5173`. Open that address in your browser.
4. To stop the preview, click the Terminal window and press Control + C.

If macOS won't open the shortcut, use Terminal instead:

1. Open Terminal (press Command + Space, type Terminal, press Return).
2. Paste this and press Return:
   ```sh
   cd "$HOME/Desktop/Every Element Frontend"
   ```
3. Run `npm install` if dependencies are missing. Node.js 22.12 or newer is required; install the current LTS from https://nodejs.org if Terminal says npm is not found.
4. Run `npm run dev`.
5. Open the local address shown in Terminal.

This local preview is only a development tool serving static files to your browser. The application itself has no server-side code. Do not double-click `dist/index.html`: JavaScript modules should be opened through the local preview.

## Try the demo

- Hover a slot to see its ID, daily price, and availability. On touch devices, tap it directly.
- Click **Build** to reveal all 124 rentable slots and prices.
- Click any rentable content to open its editor. Typing previews the change on the page. Cancel, click outside, or press Escape to discard it.
- Add text, upload a local PNG/JPG/GIF/WebP (up to 2 MB), or set an HTTP(S) destination where supported. Image descriptions become the alt text.
- Pick 1, 3, or 7 days. Three days saves 10%; seven saves 25%.
- Set the next owner's takeover price, at least 120% of the slot's base daily price.
- Confirm a pretend rental. For occupied slots the total is the chosen rental term **plus** the current owner's takeover price. This is a demo pricing choice, shown explicitly in the editor.
- The fake wallet button never opens or accesses a real wallet. Renting does not require connecting it.
- A simulated rental or takeover occurs every 10–20 seconds while the tab is visible. The active draft is excluded from random takeovers.
- Use the footer arrows to open **My slots**, **History**, **Timeline**, or **Docs**. Text labels remain separately rentable. Nav arrows jump to their sections.
- Turn on **Heat map** for slot overlays. **Heat** shows change counts; **USD** and **SOL** show estimated daily prices using configurable, fictional conversion rates.
- Press **D** outside a text field for demo controls: random takeover, fill all, empty all, or 10 immediate events. Press Escape to hide it. Emptying slots keeps the history.
- Saved destination links are available in their slot editor. Every slot click opens the editor, so its rental interaction always remains accessible.

The testimonial caption deliberately says “five slots,” as requested. Each card has five content slots (name, three lines, button), plus a separately rentable avatar: six in total.

The Trade link is a placeholder pump.fun token address. The Buy control explains this. The X footer shortcut opens the demo docs until an actual profile is configured.

## What persists?

State and uploaded images are saved in this browser tab's session storage, so a refresh generally keeps them. Closing the tab ends the session. If storage is unavailable or large uploads exceed the browser quota, changes still work in memory but may not survive refresh. No uploaded image leaves the browser. Expired slots return to their original content while the app is open or when it is reopened.

## Build the static website

From this folder in Terminal:

```sh
npm run build
```

This creates `dist/`. Preview that exact production output using:

```sh
npm run preview
```

Open the local address printed by the preview command. The complete `dist` folder is all a static host needs.

## Optional: publish on Vercel later

These are instructions only. No repository or deployment was created for you.

1. Sign in to GitHub and create a repository for this project. A private repository is fine.
2. Upload `index.html`, `package.json`, `package-lock.json`, `.gitignore`, the `src` folder, and the `public` folder to the repository root. You may also include the README and tests. Do not upload `node_modules`; Vercel installs dependencies from the package files. You don't need to upload `dist` for this source-based workflow.
3. Sign in to Vercel, choose **Add New → Project**, connect GitHub, and import that repository.
4. Check **Root Directory** points to the folder containing `package.json` (the repository root if you followed step 2).
5. Confirm **Framework Preset: Vite**, **Build Command: npm run build**, **Output Directory: dist**, and the default npm install command. Use a supported Node.js version 22.12 or newer. There are no environment variables to add.
6. Only when you want it online, choose **Deploy**. Vercel builds the files and gives you a URL.
7. Future pushes to the connected repository may trigger automatic deployments. Hash-based History/My slots routes need no rewrite rules.

Official instructions: [Vite static deployment](https://vite.dev/guide/static-deploy) and [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## File guide

- `index.html` — browser entry page, metadata, and favicon reference.
- `src/config.js` — project name, token ticker, wording, visual palette, prices, discounts, fake projects, limits, and original SVG artwork generator.
- `src/data.js` — local slot inventory, `getSlots()`, `rentSlot()`, `takeOverSlot()`, expiry, session storage, events, and simulation.
- `src/main.js` — landing-page sections, editor, live preview, navigation, demo controls, and activity views.
- `src/styles.css` — responsive desktop/mobile layout, bottom-sheet editor, slot overlays, marquee, and motion preferences.
- `public/favicon.svg` — original local site icon.
- `tests/data.test.js` — automated slot, pricing, takeover, validation, and expiry checks.
- `package.json` — app information, Vite dependency, and start/build/test commands.
- `package-lock.json` — exact dependency versions for reproducible installation.
- `.gitignore` — excludes installed dependencies and macOS metadata from Git.
- `Start local preview.command` — double-clickable Mac shortcut that starts the local preview.
- `README.md` — this guide.
- `dist/index.html` — generated production entry page.
- `dist/assets/*.js` — generated, optimized application code.
- `dist/assets/*.css` — generated, optimized stylesheet.
- `dist/favicon.svg` — production copy of the icon.
- `node_modules/` — locally installed build tools; generated by `npm install`, not application source.

## Connecting a real wallet and backend later

Keep the slot model and UI, but replace the data module's local operations with asynchronous requests and UI loading/error states. A real service must be authoritative for ownership, expiry, prices, and atomic takeovers. Session storage would become a cache, not the source of truth.

Replace the pretend wallet control with a Solana wallet adapter and wallet-signature authentication. Add a real token mint configuration, transaction construction, explicit wallet approval, and server/on-chain confirmation before a slot becomes owned. A client-side “success” cannot be treated as proof of payment.

Use a database for slots and event history, object storage for images, a background expiry process, and a live event subscription. Add input and upload validation, moderation, rate limits, and safe link handling on the service. A takeover needs an atomic ownership/version check to prevent two users buying the same state. Decide whether ownership lives in a Solana program or the backend, and how token payments and takeover proceeds settle. None of that infrastructure is included in this frontend.

## Verification

`npm test` checks unique slot identity, rental discounts, price/URL validation, rental/takeover transitions, activity recording, and expiry restoration. `npm run build` creates the production output successfully. Browser visual and click-through QA could not be performed because the desktop app could not verify its browser-access policy; responsive CSS is implemented but should be visually checked on desktop and phone before publication.
# lotsv2
