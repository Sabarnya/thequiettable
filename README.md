# The Quiet Table

A static, bilingual (English / বাংলা) recipe site — plain HTML + CSS + a tiny bit of
vanilla JavaScript. No framework, no build step, no dependencies. You own all of it,
and it hosts free anywhere.

## Folder structure

```
.
├── index.html              Home (illustrated hero, bento "this week", newsletter)
├── recipes.html            All-recipes grid
├── about.html              About Sabarnya
├── newsletter.html         Subscribe + "coming soon"
├── styles.css              ONE stylesheet for the whole site
├── download-assets.sh      Downloads the photos & switches to local images
├── assets/                 (created when you run the script — the 7 photos)
└── recipes/
    ├── summer-tomato-basil-pasta.html
    ├── lemon-thyme-roast-chicken.html
    ├── fig-honey-tart.html
    ├── wild-mushroom-risotto.html
    └── everyday-sourdough.html
```

## The look

- **Colours & layout width:** the top of `styles.css`, under `:root`. Change once, the
  whole site updates.
- **Fonts:** Lora (headings), Caveat (the script accents/labels), Inter (body) — loaded
  from Google Fonts in each page's `<head>` and named in `:root` as `--serif`, `--script`,
  `--sans`. Recipe pages also load Noto Serif Bengali + Hind Siliguri for the Bengali view.
  To change a font, swap the Google Fonts `<link>` and the matching `:root` variable.

## The images

Pages currently link the 7 photos from the original URL so the site looks complete the
moment you open it. To make it fully self-contained, run once from the project root:

```bash
bash download-assets.sh
```

It saves the photos into `assets/` and rewrites every page to use them. On Windows, use
Git Bash or WSL.

## How the bilingual recipes work

Each recipe page carries **both languages inline**. Every translatable element has two
attributes — `data-en` and `data-bn` — and a small script at the bottom of the page swaps
them when the EN / বাংলা toggle is clicked. There are no separate Bengali files to keep in
sync.

```html
<h1 data-en="Summer Tomato &amp; Basil Pasta" data-bn="গ্রীষ্মের টমেটো ও বেসিল পাস্তা"></h1>
```

The page loads in English by default. The Bengali text uses Bengali fonts automatically
(see `body.bn` rules in `styles.css`).

> Note: the Bengali translations were drafted automatically — please read them over so the
> voice sounds like yours. Editing a line means changing one `data-bn` value.

## Adding a new recipe

1. Copy any file in `recipes/` (e.g. `summer-tomato-basil-pasta.html`) to a new file like
   `recipes/your-recipe.html`.
2. Replace the text in each `data-en` / `data-bn` pair (title, category, lede, time, serves,
   story, ingredients, steps). Keep both languages filled in.
3. Add a photo to `assets/` and point the page's `<img src>` at it.
4. Add a card for it on `recipes.html` (copy one `<a class="ccard">…</a>` block), and
   optionally feature it in the "This week's recipes" bento on `index.html`.

Tip: if you'd rather not hand-edit HTML each time, this same content fits a static site
generator (Astro/11ty) where one short data file per recipe builds the page + toggle + card
automatically. Ask and it can be converted.

## Run it locally

Open `index.html` in a browser, or for clean URLs:

```bash
python3 -m http.server   # then visit http://localhost:8000
```

## Put it online (free)

- **Netlify / Cloudflare Pages** — drag the folder onto their dashboard.
- **GitHub Pages** — push the folder to a repo and enable Pages.

## Automatic newsletter (subscribe + new-recipe emails)

The site is already wired for this. Two pieces make it work:

**1. Subscribe -> the subscriber gets an email.**
All signup logic now lives in ONE file: `newsletter.js`. Open it and set a single line:

```js
var NEWSLETTER_USERNAME = "YOUR_BUTTONDOWN_USERNAME";  // <- your real Buttondown username
```

- Create a free account at buttondown.com and use that username.
- In Buttondown settings, turn on the **welcome email** (and/or double opt-in). When someone
  subscribes, the form sends their address to Buttondown and Buttondown emails them. That is the
  "subscriber gets an email" step — a static site cannot send mail itself, so this is what makes it real.
- Until you set the username, every button shows a friendly "newsletter isn't connected yet" note
  instead of failing silently.

Prefer Mailchimp / MailerLite / Brevo? Their signup also works by posting an email address to an
endpoint; tell me which and I'll point `newsletter.js` at it.

**2. New recipe -> automatic email to all subscribers.**
This uses the RSS feed:

- `feed.xml` lists your recipes (already generated).
- In your newsletter service, create an **RSS-to-email automation** pointed at your live feed
  URL: `https://your-domain.com/feed.xml`, set to "send every time a new item appears."
  (Buttondown checks the feed about every 30 minutes.)
- Publish a new recipe -> the service sees the new feed item -> subscribers get an email.
  You compose nothing.

**Keep the feed current when you add a recipe:**

1. In `gen_feed.py`, set `SITE` to your real domain (once), and add a new entry at the TOP of
   the `RECIPES` list (newest first): slug, title, category, date, description.
2. Run `python3 gen_feed.py` to rebuild `feed.xml`.
3. Redeploy.

> Tip: enable Buttondown's "skip old items" when you first connect the feed, so your existing
> five recipes are not all emailed out on day one.

### Self-hosting instead
You could replace the service with your own serverless functions (Netlify/Cloudflare) + an
email API like Resend + a store like Airtable/Supabase. More control, more setup, and you
manage deliverability (SPF/DKIM/DMARC) yourself -- usually overkill for a personal recipe
site. Ask if you want that version.

## Security hardening

**On the site (already included — the `_headers` file):**
Place stays at the project root. On Netlify or Cloudflare Pages it's read automatically and
sends these protections with every page:
- HTTPS forced (HSTS), clickjacking blocked (frame-ancestors / X-Frame-Options: DENY)
- MIME-sniffing off, a locked-down Content-Security-Policy that only allows your real
  resources (Google Fonts, your images, the Buttondown signup), and a tight referrer policy.
Note: GitHub Pages ignores `_headers`. Use Netlify or Cloudflare Pages (both honor it), or put
Cloudflare in front of the site, to get these headers.

**On your domain / accounts (do this in Namecheap):**
- Turn on 2FA using an authenticator app (not SMS).
- Keep Domain Lock ON (blocks unauthorized transfers / domain hijacking).
- Turn on Auto-Renew (an expired domain can be snatched).
- Keep free WHOIS privacy ON.
- Enable DNSSEC (stops DNS spoofing). If you move DNS to Cloudflare, enable it there instead.
- Ignore "verify your account" emails with links — go to namecheap.com directly.

**On email (so nobody can forge mail from your domain):**
- Add the SPF, DKIM, and DMARC TXT records Buttondown gives you, at Namecheap.
- Start DMARC at `p=none` to watch, then tighten to `quarantine` or `reject`.

## Domain: thequiettable.co

The site is wired for `https://thequiettable.co`:
- `gen_feed.py` uses it (SITE), so `feed.xml` recipe links are absolute and correct.
- Every page has a `<link rel="canonical">` and Open Graph / Twitter share tags pointing at it.
- `sitemap.xml` and `robots.txt` are generated for search engines.
- `_redirects` forwards `www.thequiettable.co` -> `thequiettable.co` (the apex is the canonical
  address). If you'd rather have www as primary, flip the rule and the canonicals.

**Before you go live (recommended):** run `download-assets.sh` / `download-assets.ps1` so the
photos are served from your own domain instead of hotlinked. After that, the social-share
image (`og:image`) and on-page images all come from thequiettable.co, and you can tighten the
CSP in `_headers` (change `img-src` to just `'self' data:`).

**DNS at Namecheap:** point the domain at your host (Netlify/Cloudflare Pages give you the exact
A / CNAME records), add the `www` CNAME, then add Buttondown's SPF/DKIM/DMARC TXT records.

## Images (placeholders)

The photos in `assets/` are vintage placeholder images (generated), so the site looks complete
out of the box. To use your own:
- Drop your image into `assets/` with the SAME filename to swap it instantly (e.g. replace
  `assets/quiet-table-pastel-sdg0YE5f.jpg` with your landing photo), OR
- Use any filename and update the `src` (and the `og:image`) in the relevant page.
The landing hero is `assets/quiet-table-pastel-sdg0YE5f.jpg` — that's the one to replace with
your main image.

## Analytics (GoatCounter — free, privacy-friendly, no cookie banner)

The site is wired for GoatCounter. To turn it on:

1. Make a free account at https://www.goatcounter.com — pick a code (subdomain),
   e.g. `quiettable`, giving you `https://quiettable.goatcounter.com`.
2. Find-and-replace `YOUR_CODE` with that code in every HTML file. On Windows
   PowerShell, from the project folder:

   ```powershell
   Get-ChildItem -Recurse -Filter *.html |
     ForEach-Object {
       (Get-Content $_.FullName -Raw) -replace 'YOUR_CODE','quiettable' |
         Set-Content $_.FullName -NoNewline
     }
   ```

   (Replace `quiettable` with your real code.)
3. Deploy. GoatCounter automatically ignores visits from `localhost`/`127.0.0.1`,
   so previewing locally with `start-localhost.bat` won't pollute your stats.

To disable analytics, delete the two `<script data-goatcounter …>` lines (marked
with `<!-- analytics: remove this line to disable -->`) from each page.

The Content-Security-Policy in `_headers` already allows GoatCounter
(`gc.zgo.at` for the script, `*.goatcounter.com` for the counting endpoint).
