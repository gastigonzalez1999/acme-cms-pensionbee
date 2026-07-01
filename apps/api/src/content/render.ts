/**
 * Pure markdown → HTML renderer.
 *
 * Deliberately framework-agnostic: no Nest imports, no side effects.
 * Easy to unit-test without spinning up a module.
 *
 * Why markdown-it: CommonMark-compliant, plugin-friendly, actively
 * maintained.  Why sanitize-html on top: marketing staff control the
 * content, so we must strip any dangerous markup even though the markdown
 * renderer itself doesn't output it by default.
 *
 * Front-matter (gray-matter) is parsed before rendering so marketing can
 * set date, author, description and tags in YAML at the top of index.md.
 */
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import matter from 'gray-matter';

const md = new MarkdownIt({
  html: false,      // don't allow raw HTML in markdown source
  linkify: true,    // auto-link URLs
  typographer: true,
});

export interface RenderedPage {
  title: string;
  description: string;
  html: string;
  date?: string;
  author?: string;
  tags?: string[];
  readingTime: number;
}

export function renderMarkdown(source: string): RenderedPage {
  // Strip front-matter (YAML between --- delimiters) before parsing.
  // gray-matter returns `data` (the YAML object) and `content` (the body).
  const { data, content: markdown } = matter(source);

  // Reading time: count words in the body text (average reader = 200 wpm).
  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  // Parse the token stream once; both title extraction and rendering use it.
  // Using the parsed tree rather than a regex avoids:
  //   • picking up # lines inside fenced code blocks
  //   • missing setext headings (Title\n====)
  //   • returning raw markdown syntax (e.g. **bold**) in the title string
  const tokens = md.parse(markdown, {});

  const h1Idx = tokens.findIndex((t) => t.type === 'heading_open' && t.tag === 'h1');
  let title = 'Welcome to Acme';
  if (h1Idx !== -1) {
    const inline = tokens[h1Idx + 1];
    if (inline?.type === 'inline' && inline.children) {
      // Collect only text and code_inline leaves — strips strong/em/etc. markers.
      const text = inline.children
        .filter((t) => t.type === 'text' || t.type === 'code_inline')
        .map((t) => t.content)
        .join('')
        .trim();
      if (text) title = text;
    }
  }

  // Description: prefer front-matter field; fall back to first paragraph.
  let description: string = typeof data.description === 'string' ? data.description : '';
  if (!description) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'paragraph_open') {
        const inline = tokens[i + 1];
        if (inline?.type === 'inline' && inline.children) {
          const text = inline.children
            .filter((t) => t.type === 'text' || t.type === 'code_inline')
            .map((t) => t.content)
            .join('')
            .trim();
          if (text) {
            description = text.length > 160 ? text.slice(0, 157) + '…' : text;
            break;
          }
        }
      }
    }
  }

  const rawHtml = md.render(markdown);

  // Sanitize the rendered HTML.
  //
  // Allowed-tag notes:
  //   • sanitize-html defaults already include h1–h6 (no need to re-list them)
  //   • img is added explicitly so marketing can embed images in content;
  //     allowed schemes are limited to http/https (no data: URIs)
  //
  // Link safety:
  //   • target is kept in the allowlist (authors may need it)
  //   • transformTags forces rel="noopener noreferrer" whenever target is set,
  //     preventing reverse-tabnapping attacks
  const html = sanitizeHtml(rawHtml, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    transformTags: {
      // Force safe link attributes when a link opens in a new tab.
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: attribs.target
          ? { ...attribs, rel: 'noopener noreferrer' }
          : attribs,
      }),
    },
  });

  const date: string | undefined =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : typeof data.date === 'string'
        ? data.date
        : undefined;

  const author: string | undefined =
    typeof data.author === 'string' ? data.author : undefined;

  const tags: string[] | undefined = Array.isArray(data.tags)
    ? data.tags.map(String)
    : undefined;

  return { title, description, html, date, author, tags, readingTime };
}
