/**
 * Document link and cross-reference check (Document 15 §5, `docs.yml`).
 *
 * The numbered documents are the project's source of truth and they reference each
 * other constantly. A renamed or missing file turns a decision record into a dead end,
 * and that failure is invisible in a normal diff review.
 *
 * Deliberately offline: it resolves relative links against the filesystem and never
 * requests an external URL. A checker that depends on third-party uptime produces red
 * builds that carry no information about this repository.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'coverage', 'build']);

/** Markdown inline links: `[label](target)`. Reference-style links are not used here. */
const INLINE_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const FENCED_BLOCK = /^```[\s\S]*?^```/gm;

/** A numbered decision document, e.g. `10_capsule_specification.md`. */
const NUMBERED_DOCUMENT = /^\d{2}_.+\.md$/;

/**
 * Documents 16 and 17 are intentionally published at the repository root under their
 * conventional names rather than in `docs/` (Document 00, Document 14 §1).
 */
const ROOT_HOSTED_DOCUMENTS = ['CONTEXT.md', 'CLAUDE.md'];

function findMarkdownFiles(directory) {
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
      found.push(...findMarkdownFiles(join(directory, entry.name)));
    } else if (entry.name.endsWith('.md')) {
      found.push(join(directory, entry.name));
    }
  }

  return found;
}

function extractLinkTargets(markdown) {
  const withoutCode = markdown.replace(FENCED_BLOCK, '');
  const targets = [];

  for (const match of withoutCode.matchAll(INLINE_LINK)) {
    targets.push(match[1]);
  }

  return targets;
}

function isExternal(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');
}

const markdownFiles = findMarkdownFiles(repoRoot);
const brokenLinks = [];
const linkedPaths = new Set();

for (const file of markdownFiles) {
  const targets = extractLinkTargets(readFileSync(file, 'utf8'));

  for (const target of targets) {
    // Same-document anchors have no file to resolve.
    if (target.startsWith('#')) continue;
    if (isExternal(target)) continue;

    const [path] = target.split('#');
    if (path === '') continue;

    const resolved = resolve(dirname(file), decodeURIComponent(path));
    linkedPaths.add(resolved);

    if (!existsSync(resolved)) {
      brokenLinks.push({
        source: relative(repoRoot, file),
        target,
      });
    }
  }
}

const documentsDirectory = join(repoRoot, 'docs');
const unreferencedDocuments = [];

if (existsSync(documentsDirectory) && statSync(documentsDirectory).isDirectory()) {
  const numbered = readdirSync(documentsDirectory).filter((name) => NUMBERED_DOCUMENT.test(name));

  for (const name of numbered) {
    const absolute = join(documentsDirectory, name);
    if (!linkedPaths.has(absolute)) {
      unreferencedDocuments.push(relative(repoRoot, absolute).split(sep).join('/'));
    }
  }
}

const missingRootDocuments = ROOT_HOSTED_DOCUMENTS.filter(
  (name) => !existsSync(join(repoRoot, name)),
);

const failures = [];

if (brokenLinks.length > 0) {
  failures.push(
    `Broken relative links (${brokenLinks.length}):\n` +
      brokenLinks.map(({ source, target }) => `  ${source} -> ${target}`).join('\n'),
  );
}

if (unreferencedDocuments.length > 0) {
  failures.push(
    `Numbered documents not linked from any other document (${unreferencedDocuments.length}):\n` +
      unreferencedDocuments.map((name) => `  ${name}`).join('\n'),
  );
}

if (missingRootDocuments.length > 0) {
  failures.push(
    `Root-hosted documents missing (${missingRootDocuments.length}):\n` +
      missingRootDocuments.map((name) => `  ${name}`).join('\n'),
  );
}

if (failures.length > 0) {
  console.error(`\ncheck:docs failed.\n\n${failures.join('\n\n')}\n`);
  process.exit(1);
}

console.error(
  `check:docs passed — ${markdownFiles.length} Markdown files scanned, ` +
    `${linkedPaths.size} relative link targets resolved.`,
);
