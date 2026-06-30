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
 */
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const md = new MarkdownIt({
  html: false,      // don't allow raw HTML in markdown source
  linkify: true,    // auto-link URLs
  typographer: true,
});

export interface RenderedPage {
  title: string;
  html: string;
}

export function renderMarkdown(markdown: string): RenderedPage {
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

  return { title, html };
}
