# Content Authoring Guide

For marketing staff adding and editing pages.

## How pages work

Each page is a folder inside the `content/` directory at the root of the repository. The folder name becomes the URL path. Inside the folder is an `index.md` file written in Markdown.

```
content/
├── about-page/        →  /about-page
│   └── index.md
├── jobs/              →  /jobs
│   └── index.md
└── blog/
    └── june/          →  /blog/june doesn't need its own page
        └── company-update/    →  /blog/june/company-update
            └── index.md
```

## Writing content

Markdown is a simple text format. Here's what you can use:

```markdown
# Page Title (H1 — also becomes the browser tab title)

## Section Heading (H2)

This is a paragraph. You can write normally and press Enter twice to start a new paragraph.

**Bold text** and *italic text*.

A [link](https://example.com).

- Bullet point
- Another point
```

## Adding a new page

1. Create a new folder inside `content/` with the desired URL name:
   ```bash
   mkdir content/new-product
   ```

2. Create an `index.md` file in that folder:
   ```bash
   # or just create the file in your editor
   content/new-product/index.md
   ```

3. Start the file with a `#` heading — this becomes the page title:
   ```markdown
   # New Product

   Describe your new product here...
   ```

4. Commit and push. The page will appear at `/new-product` immediately — **no code changes needed**.

## Nested pages

You can nest pages to any depth:

```
content/blog/2025/june/company-update/index.md  →  /blog/2025/june/company-update
```

Intermediate folders without an `index.md` are not pages — they just group sub-pages.

## Optional front-matter

You can add YAML front-matter at the very top of any `index.md` to provide metadata that enriches the page. The front-matter block is surrounded by `---` delimiters:

```markdown
---
date: 2026-06-01
author: Jane Smith
description: A short one-sentence summary shown in link previews and RSS feeds (max ~160 chars).
tags: [company, update, finance]
---

# Page Title

Page content starts here...
```

| Field | Description | Example |
|---|---|---|
| `date` | Publication date (ISO 8601) — shown on the page and used to sort the RSS feed | `2026-06-01` |
| `author` | Author name — shown on the page | `Jane Smith` |
| `description` | Short summary for SEO meta and RSS `<description>` — overrides the auto-extracted first paragraph | `A short summary.` |
| `tags` | Topic tags (not rendered on page yet, but stored for future use) | `[company, update]` |

All fields are optional. Pages without front-matter work exactly as before.

## Important notes

- The folder name becomes the URL, so use lowercase letters, numbers, and hyphens. No spaces or special characters.
- Each page folder must have exactly one `index.md` file.
- Changes take effect immediately after deployment (or on next restart in development).
