/**
 * ContentSource abstraction.
 *
 * Why the abstraction:  today the source is the local filesystem.
 * Tomorrow it could be a headless CMS, a database, or an S3 bucket.
 * Inverting control here means the ContentService and controller are
 * never touched when the storage backend changes — we swap the provider
 * in content.module.ts and inject it under the same token.
 *
 * This is a deliberate exception to "no single-use abstractions": the
 * future use-case is documented and the seam is cheap.  It also provides
 * a present-day payoff: e2e tests override CONTENT_SOURCE to point at a
 * temp fixture dir without env-var timing games.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** DI provider token — import this symbol when you need to inject the source. */
export const CONTENT_SOURCE = 'CONTENT_SOURCE' as const;

export interface ContentSource {
  /** Return the raw markdown for the given path segments, or null if not found. */
  read(segments: string[]): Promise<string | null>;
  /** Return all available page paths as arrays of segments. */
  list(): Promise<string[][]>;
}

/**
 * Filesystem implementation of ContentSource.
 *
 * Takes `contentDir` as a plain constructor argument — the DI factory in
 * content.module.ts reads from ConfigService and instantiates this class.
 * Keeping ConfigService out of this class makes it trivial to test:
 *   `new FileSystemContentSource('/tmp/fixtures')`.
 */
export class FileSystemContentSource implements ContentSource {
  private readonly contentDir: string;

  constructor(contentDir: string) {
    this.contentDir = path.resolve(contentDir);
  }

  async read(segments: string[]): Promise<string | null> {
    // Reject obviously malicious segments before path.resolve so we never
    // inadvertently escape the content root.
    if (segments.length === 0) return null;
    if (segments.some((s) => s === '..' || s.includes('/') || s.includes('\\'))) {
      return null;
    }

    const filePath = path.resolve(this.contentDir, ...segments, 'index.md');

    // Double-check that the resolved path is still inside contentDir.
    if (!filePath.startsWith(this.contentDir + path.sep)) {
      return null;
    }

    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      // ENOENT (file missing) and ENOTDIR (path component is a file, not a dir)
      // both mean "page doesn't exist" → return null so the controller sends 404.
      // All other errors (EACCES, EISDIR, etc.) are genuine failures → rethrow
      // so the global exception filter turns them into 500 responses with logging.
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        return null;
      }
      throw err;
    }
  }

  async list(): Promise<string[][]> {
    const results: string[][] = [];

    const walk = async (dir: string, segments: string[]): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return; // Directory unreadable — silently skip.
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          await walk(path.join(dir, entry.name), [...segments, entry.name]);
        }
      }

      // Only record this folder if it has an index.md and is not the root.
      if (segments.length > 0) {
        try {
          await fs.access(path.join(dir, 'index.md'));
          results.push(segments);
        } catch {
          // No index.md — not a content page.
        }
      }
    };

    await walk(this.contentDir, []);
    return results;
  }
}
