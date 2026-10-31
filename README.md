# MISS FISH AMSTERDAM 2026 — Upgraded website

A polished, mobile-friendly update to the original Miss Fish site. The artwork, fish descriptions and existing `miss-fish-vote` Netlify form are preserved.

## Do I need a new website or QR code?

**No.** Deploy this project to your **existing Netlify site** (`luminous-eclair-a2730e`) and its address stays `https://luminous-eclair-a2730e.netlify.app/`. The QR code continues to point to the same address. Do **not** choose "create a new project" during deployment.

**One extra step is needed for real public results:** the leaderboard uses a Netlify Function and a private Netlify personal access token. Merely copying `public/` to Netlify Drop can publish the visual changes, but **it does not reliably deploy the serverless function**. Follow the CLI steps below to deploy both.

## What's new

- Prominent official link to **https://thegreenmileamsterdam.nl** in the navigation, EcoWal section, and footer.
- A **View results** button below the voting form. The live leaderboard shows all four percentages and vote counts, and identifies the current leader (or a tie). The **Refresh** button gets updated figures.
- Smooth hover motion on the four fish profile cards.
- Selecting a finalist in the ballot highlights their full-size card in their own accent colour. Choosing a fish from its profile also selects the ballot option.
- Celebration bubbles at successful vote confirmation (respecting reduced-motion accessibility preferences).
- Gently animated water gradients and improved responsive mobile spacing.
- No visitor names or email addresses are requested. The public results API exposes **only aggregate counts**, never submission details.

## 1. Set up your Netlify API token (needed for real live counts)

1. Log in to your Netlify account at https://app.netlify.com/ .
2. Under your **User settings / Applications / Personal access tokens**, create a token for this website's server-side results integration. Pick a sensible expiration and keep it private. **Do not send the token to anyone or paste it into HTML, JavaScript, GitHub or chat.** A personal access token can have significant account permissions; revoke it when not needed.
3. Open the **existing** Netlify site dashboard for `luminous-eclair-a2730e`.
4. Go to **Project configuration → Environment variables**, and add:
   - **Key:** `NETLIFY_API_TOKEN`
   - **Value:** your personal access token (never put this in a file)
   - **Scope:** includes **Functions**, if scope selection is available.
5. Netlify sets the `SITE_ID` environment variable automatically. You **don't** need to define it.
6. **Redeploy after adding/changing the token** so the function gets the current environment values.

Official references: https://docs.netlify.com/manage/accounts-and-billing/user-settings/ and https://docs.netlify.com/build/functions/environment-variables/

## 2. Update your CURRENT Netlify website (recommended: Netlify CLI)

These instructions assume Windows and VS Code, but the commands work in macOS/Linux terminals too.

1. Extract this ZIP. Open the extracted **`miss-fish-2026-upgrade`** project folder in VS Code (**File → Open Folder**).
2. In VS Code select **Terminal → New Terminal**. Make sure you are inside the directory containing `netlify.toml`, `public`, and `netlify`.
3. You need **Node.js** installed. If `node --version` doesn't work, install Node.js LTS from https://nodejs.org/ and reopen VS Code.
4. In the terminal run:

   ```sh
   npx netlify-cli login
   ```

   Accept the browser login request (only on your own computer).

5. Link this folder to the **existing** site:

   ```sh
   npx netlify-cli link
   ```

   When prompted, choose **Link this directory to an existing project** and select `luminous-eclair-a2730e`. Do NOT create a new site.

6. Deploy the static site and the function together:

   ```sh
   npx netlify-cli deploy --prod --no-build --dir=public --functions=netlify/functions
   ```

7. Once deployed, open **https://luminous-eclair-a2730e.netlify.app/** to see the changes. Your old QR code remains valid.

**Alternative:** Connect this project to a GitHub repo and link that repo to the **existing** Netlify project for automatic build+functions deployments. Make sure Netlify's publish directory is `public` and function directory is `netlify/functions` (already specified in `netlify.toml`).

## 3. Verify everything works

1. In your Netlify dashboard, check **Forms → `miss-fish-vote`** still exists; enable form detection if needed.
2. In the Netlify dashboard, open **Functions** and confirm a function named `results` is deployed.
3. Load the website and click **View results**. It should show all four verified vote totals. If the form has no votes yet, it will show **0 votes**, not made-up numbers.
4. Cast one vote from a fresh browser/device and verify the submission appears in **Forms**; reload the leaderboard (Netlify's verification process can take a moment).
5. Scan your existing QR code. It still opens the same website URL.

If "View results" shows an error:

- **Results service is not running** → deploy with the Netlify CLI including `--functions=netlify/functions`; dragging only the `public` folder isn't enough.
- **Need one-time Netlify setup** → add `NETLIFY_API_TOKEN` under Environment variables (Functions scope), and redeploy.
- **No miss-fish-vote form** → check Netlify Forms detection, that the original form name is unchanged, and redeploy.
- **Results temporarily unavailable** → check **Netlify dashboard → Functions → results → Logs**, the token and site permissions.
- **Previously voted on this browser?** This site remembers that in localStorage to discourage immediate repeats. It doesn't prevent voting on another device or browser. Use a fresh browser for a test; do not rely on this for one-person-one-vote enforcement.

## Folder guide

```text
miss-fish-2026-upgrade/
├── netlify.toml                   Netlify publish / functions configuration
├── README.md                      Full setup and handover instructions
├── QUICK_START.txt                Quick steps for existing site
├── public/                        Public website files
│   ├── index.html                 Website layout and voting form
│   ├── styles.css                 Responsive styles and animations
│   ├── script.js                  Interactive voting and results rendering
│   ├── assets/                    Original fish and EcoWal images
│   └── thank-you/index.html       Form fallback confirmation
└── netlify/functions/results.mjs  Private server-side Netlify Forms vote aggregator
```

## Privacy, reliability and fairness

- The **Netlify API token must remain in your Netlify environment settings**. It is not in any of these files and must never be added to public JavaScript or a GitHub repo.
- Public endpoint `/.netlify/functions/results` shows **only Percia/Stella/Bella/Roxy counts**, totals, and update time. Netlify Forms stores the original submissions in your site's account.
- Only **verified** Netlify Form submissions are counted (spam-filtered submissions are excluded). Deleted/filtered submissions change totals accordingly.
- Refresh requests are not real-time push updates; counts may update a bit after voting.
- Counting is limited to 5,000 submissions to protect API usage. Above that the function returns a clear error rather than a misleading partial leaderboard. For larger campaigns, use a dedicated database or analytics backend.
- This is an **informal public-engagement poll**, not secure one-person-one-vote and not a scientific measure of nature connectedness. Netlify Forms, browser storage, and basic spam detection cannot guarantee vote integrity.
- If the personal access token expires or is revoked, the leaderboard needs a new server-side token and redeployment; the website and standard voting form can still work.
- Keep source code and account credentials separate when transferring the site to The Green Mile; they can set up their **own** token after transfer.

## Preview locally

Open `public/index.html` directly or use VS Code Live Server. The ballot operates in **preview mode** and cannot submit votes or display actual shared results locally. For testing both Netlify Functions and Netlify Forms, use Netlify CLI `npx netlify-cli dev` from the root project folder after linking your site. Be careful testing to avoid real submissions if using your production site configuration.

## Original design

Based on the group's final Miss Fish infographic for The Green Mile. It uses the original supplied fish illustrations and playful descriptions. The site does not claim every fish has been observed at the specific EcoWal installation.
