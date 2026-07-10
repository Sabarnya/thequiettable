#!/usr/bin/env python3
"""
Generates feed.xml — the RSS feed the newsletter service watches.
When you add a recipe: add an entry to RECIPES below (newest first) and run:
    python3 gen_feed.py
Then redeploy. Your newsletter service will detect the new item and email subscribers.
"""
from email.utils import format_datetime
from datetime import datetime, timezone
import html

# ---- EDIT THIS: your live site URL (no trailing slash), once you deploy ----
SITE = "https://thequiettable.co"

SITE_TITLE = "The Quiet Table"
SITE_DESC  = "Slow, seasonal recipes and the stories that go with them."

# ---- Newest first. date = when published (YYYY-MM-DD). ----
RECIPES = [
  {"slug":"summer-tomato-basil-pasta","title":"Summer Tomato & Basil Pasta",
   "category":"Pasta","date":"2026-06-05",
   "description":"The first warm evening of the year, on a plate."},
  {"slug":"lemon-thyme-roast-chicken","title":"Lemon & Thyme Roast Chicken",
   "category":"Mains","date":"2026-05-24",
   "description":"A Sunday ritual, with brown butter pan juices."},
  {"slug":"fig-honey-tart","title":"Fig & Honey Tart",
   "category":"Sweets","date":"2026-05-10",
   "description":"Late summer figs on a buttery, almost-shortbread crust."},
  {"slug":"wild-mushroom-risotto","title":"Wild Mushroom Risotto",
   "category":"Mains","date":"2026-04-28",
   "description":"Slow stirring, a quiet kitchen, a glass of something white."},
  {"slug":"everyday-sourdough","title":"Everyday Sourdough",
   "category":"Bread","date":"2026-04-12",
   "description":"The loaf I bake on Saturdays, almost without thinking."},
]

def rfc822(date_str):
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return format_datetime(dt)

items = []
for r in RECIPES:
    link = "{}/recipes/{}.html".format(SITE, r["slug"])
    items.append("""    <item>
      <title>{title}</title>
      <link>{link}</link>
      <guid>{link}</guid>
      <category>{category}</category>
      <pubDate>{pub}</pubDate>
      <description>{desc}</description>
    </item>""".format(
        title=html.escape(r["title"]), link=link,
        category=html.escape(r["category"]), pub=rfc822(r["date"]),
        desc=html.escape(r["description"])))

feed = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{title}</title>
    <link>{site}</link>
    <description>{desc}</description>
    <language>en</language>
    <lastBuildDate>{now}</lastBuildDate>
{items}
  </channel>
</rss>
""".format(title=SITE_TITLE, site=SITE, desc=SITE_DESC,
           now=format_datetime(datetime.now(timezone.utc)),
           items="\n".join(items))

with open("feed.xml", "w") as f:
    f.write(feed)
print("wrote feed.xml with {} recipes".format(len(RECIPES)))

# ---- also generate sitemap.xml ----
static_pages = ["", "recipes.html", "about.html", "newsletter.html"]
recipe_pages = ["recipes/{}.html".format(r["slug"]) for r in RECIPES]
urls = static_pages + recipe_pages
sm_items = []
for u in urls:
    loc = SITE + "/" + u
    sm_items.append("  <url><loc>{}</loc></url>".format(loc))
sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(sm_items) + "\n</urlset>\n"
with open("sitemap.xml", "w") as f:
    f.write(sitemap)
print("wrote sitemap.xml with {} urls".format(len(urls)))
