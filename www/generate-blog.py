#!/usr/bin/env python3
"""
Generate static HTML blog pages from Supabase blog_post table.
Fetches all published posts and creates individual HTML files + index page.
"""

import json
import os
import hashlib
import urllib.request
from datetime import datetime

SUPABASE_URL = "https://ldyoiexyqvklujvwcaqq.supabase.co/rest/v1/blog_post"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeW9pZXh5cXZrbHVqdndjYXFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc2MjE2OCwiZXhwIjoyMDg5MzM4MTY4fQ.hDzw0w2ZCxwAjfU9LINoLChV9EW-oe0Zc2yogIzWCJc"
BLOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "blog")


def fetch_posts():
    """Fetch all published blog posts from Supabase."""
    url = f"{SUPABASE_URL}?status=eq.published&select=id,slug,title,meta_description,keyword,html_content,author,published_at&order=published_at.desc"
    req = urllib.request.Request(url)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def format_date(published_at):
    """Format ISO date to 'Mar 29, 2026' style."""
    if not published_at:
        return ""
    try:
        dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y").replace(" 0", " ")
    except Exception:
        return published_at[:10]


def generate_post_html(post):
    """Generate full HTML page for a single blog post."""
    title = post["title"] or ""
    meta_desc = post["meta_description"] or ""
    author = post["author"] or "Posterita Team"
    date_str = format_date(post["published_at"])
    html_content = post["html_content"] or ""

    # Escape for HTML attributes
    title_attr = title.replace('"', '&quot;')
    meta_attr = meta_desc.replace('"', '&quot;')

    return f'''<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <!-- Google Analytics (GA4) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","GA_MEASUREMENT_ID");</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Posterita POS Blog</title>
  <meta name="description" content="{meta_attr}" />
  <meta property="og:title" content="{title_attr}" />
  <meta property="og:description" content="{meta_attr}" />
  <meta property="og:type" content="article" />
  <link rel="icon" type="image/png" href="/img/posterita-logo-square.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      theme: {{
        extend: {{
          colors: {{
            brand: {{ 50:'#eff6ff', 100:'#dbeafe', 200:'#bfdbfe', 300:'#93c5fd', 400:'#60a5fa', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8', 800:'#1e40af', 900:'#1e3a8a' }},
          }},
          fontFamily: {{ sans: ['Inter', 'system-ui', 'sans-serif'] }},
        }}
      }}
    }}
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body {{ font-family: 'Inter', system-ui, sans-serif; }}
  </style>
</head>
<body class="bg-white text-gray-900">
  <nav class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
    <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <img src="/img/posterita-logo.png" alt="Posterita" class="h-7" />
      </a>
      <div class="flex items-center gap-4">
        <a href="/blog/" class="text-sm text-gray-500 hover:text-gray-900 transition">Blog</a>
        <a href="/" class="text-sm text-gray-500 hover:text-gray-900 transition">Home</a>
        <a href="https://web.posterita.com/customer/signup" class="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition">Try Free</a>
      </div>
    </div>
  </nav>

  <article class="max-w-3xl mx-auto px-4 py-12">
    <div class="mb-8">
      <a href="/blog/" class="text-sm text-brand-600 hover:text-brand-700 transition">&larr; Back to Blog</a>
    </div>
    <h1 class="text-3xl sm:text-4xl font-black mb-4 leading-tight">{title}</h1>
    <div class="flex items-center gap-3 text-sm text-gray-400 mb-8">
      <span>{author}</span>
      <span>&middot;</span>
      <time>{date_str}</time>
    </div>
    {html_content}
  </article>

  <section class="py-16 bg-gray-50">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <h2 class="text-2xl font-bold mb-4">Ready to transform your business?</h2>
      <p class="text-gray-500 mb-6">Try Posterita POS for free. No credit card required.</p>
      <a href="https://web.posterita.com/customer/signup" class="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition">Start Free Today</a>
    </div>
  </section>

  <footer class="bg-gray-900 text-gray-400 py-8">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="text-sm">&copy; 2019&ndash;2026 Posterita Ltd. All rights reserved.</p>
      <div class="flex items-center gap-4 text-sm">
        <a href="/" class="hover:text-white transition">Home</a>
        <a href="/blog/" class="hover:text-white transition">Blog</a>
        <a href="https://web.posterita.com/customer/login" class="hover:text-white transition">Login</a>
      </div>
    </div>
  </footer>
  <script src="/assets/chat-widget.js" defer></script>
</body>
</html>'''


def generate_index_html(posts):
    """Generate blog index page with cards for all posts."""
    cards = []
    for post in posts:
        title = post["title"] or ""
        meta_desc = post["meta_description"] or ""
        author = post["author"] or "Posterita Team"
        slug = post["slug"]
        date_str = format_date(post["published_at"])

        # Truncate excerpt to 150 chars
        excerpt = meta_desc[:150]
        if len(meta_desc) > 150:
            excerpt = excerpt.rsplit(" ", 1)[0] + "..."

        card = f'''
      <a href="/blog/{slug}.html" class="blog-card block bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div class="p-5">
          <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>{author}</span>
            <span>&middot;</span>
            <time>{date_str}</time>
          </div>
          <h2 class="text-lg font-bold mb-2 leading-snug">{title}</h2>
          <p class="text-sm text-gray-500 leading-relaxed">{excerpt}</p>
          <span class="inline-block mt-3 text-sm font-semibold text-brand-600">Read more &rarr;</span>
        </div>
      </a>'''
        cards.append(card)

    cards_html = "\n".join(cards)

    return f'''<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <!-- Google Analytics (GA4) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","GA_MEASUREMENT_ID");</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog | Posterita POS &mdash; Case Studies &amp; Updates</title>
  <meta name="description" content="Read how businesses transformed their operations with Posterita POS. Case studies, compliance updates, and retail insights." />
  <link rel="icon" type="image/png" href="/img/posterita-logo-square.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      theme: {{
        extend: {{
          colors: {{
            brand: {{ 50:'#eff6ff', 100:'#dbeafe', 200:'#bfdbfe', 300:'#93c5fd', 400:'#60a5fa', 500:'#3b82f6', 600:'#2563eb', 700:'#1d4ed8', 800:'#1e40af', 900:'#1e3a8a' }},
          }},
          fontFamily: {{ sans: ['Inter', 'system-ui', 'sans-serif'] }},
        }}
      }}
    }}
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    body {{ font-family: 'Inter', system-ui, sans-serif; }}
    .blog-card:hover {{ transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }}
    .blog-card {{ transition: all 0.3s ease; }}
  </style>
</head>
<body class="bg-white text-gray-900">
  <!-- Nav -->
  <nav class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
    <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2">
        <img src="/img/posterita-logo.png" alt="Posterita" class="h-7" />
      </a>
      <div class="flex items-center gap-4">
        <a href="/blog/" class="text-sm text-gray-900 font-semibold transition">Blog</a>
        <a href="/" class="text-sm text-gray-500 hover:text-gray-900 transition">Home</a>
        <a href="https://web.posterita.com/customer/signup" class="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition">Try Free</a>
      </div>
    </div>
  </nav>

  <!-- Header -->
  <section class="bg-gradient-to-br from-brand-900 via-brand-600 to-purple-600 py-20">
    <div class="max-w-5xl mx-auto px-4 text-center">
      <h1 class="text-4xl sm:text-5xl font-black text-white mb-4">Posterita Blog</h1>
      <p class="text-brand-200 text-lg max-w-2xl mx-auto">Case studies, compliance updates, and insights from retailers who transformed their businesses with Posterita POS.</p>
    </div>
  </section>

  <!-- Blog Grid -->
  <section class="max-w-5xl mx-auto px-4 py-16">
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
{cards_html}
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 bg-gray-50">
    <div class="max-w-3xl mx-auto px-4 text-center">
      <h2 class="text-2xl font-bold mb-4">Ready to transform your business?</h2>
      <p class="text-gray-500 mb-6">Try Posterita POS for free. No credit card required.</p>
      <a href="https://web.posterita.com/customer/signup" class="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition">Start Free Today</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 py-8">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="text-sm">&copy; 2019&ndash;2026 Posterita Ltd. All rights reserved.</p>
      <div class="flex items-center gap-4 text-sm">
        <a href="/" class="hover:text-white transition">Home</a>
        <a href="/blog/" class="hover:text-white transition">Blog</a>
        <a href="https://web.posterita.com/customer/login" class="hover:text-white transition">Login</a>
      </div>
    </div>
  </footer>
  <script src="/assets/chat-widget.js" defer></script>
</body>
</html>'''


def main():
    print("Fetching published blog posts from Supabase...")
    posts = fetch_posts()
    print(f"Found {len(posts)} published posts.")

    os.makedirs(BLOG_DIR, exist_ok=True)

    created = 0
    skipped = 0
    updated = 0

    for post in posts:
        slug = post["slug"]
        filepath = os.path.join(BLOG_DIR, f"{slug}.html")
        new_html = generate_post_html(post)
        new_hash = hashlib.sha256(new_html.encode()).hexdigest()

        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                existing_hash = hashlib.sha256(f.read().encode()).hexdigest()
            if existing_hash == new_hash:
                skipped += 1
                continue
            else:
                updated += 1

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_html)
        created += 1

    print(f"\nPost files: {created} created/updated, {skipped} unchanged (skipped)")

    # Generate index
    index_path = os.path.join(BLOG_DIR, "index.html")
    index_html = generate_index_html(posts)
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_html)
    print("Blog index regenerated.")

    # Count total files
    total_files = len([f for f in os.listdir(BLOG_DIR) if f.endswith(".html")])
    print(f"\nTotal HTML files in blog/: {total_files}")
    print("Done!")


if __name__ == "__main__":
    main()
