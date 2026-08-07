// Builds the in-app comms feed the Surface Labs app syncs, per the app repo's
// comms contract. Runs after `astro build` and writes into dist/app/:
//
//   comms.json                     schema, version, latest, items, changelog
//   comms/<id>.<hash>.md           full bodies, fetched when a card is opened
//   comms/img/<name>.<hash>.webp   app-resolution image derivatives
//
// Deliberately *beside* dist/docs/app/ rather than inside it. The two exports
// have opposite change rates and must not invalidate each other: a typo fix in
// an announcement must not bust the docs manifest ETag and make every client
// re-check 55 articles, and a docs rebuild must not republish comms and
// re-toast a release.
//
// Two sources, one export:
//
//   src/content/announcements/*.md   in-app only, never rendered publicly
//   src/content/blog/*.md            opted in per post with `announce: true`
//
// plus src/content/changelog/*.md for release notes merged over the copy
// bundled in the app, and src/comms-config.mjs for the feed-level `latest`.
//
// Authoring rules live in scripts/COMMS_AUTHORING.md.
//
// Everything the app would silently skip is a build error here instead. The
// app's rejection rules exist so one bad entry cannot cost the reader the
// other nineteen; they are not a licence to publish entries that get dropped.

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';
import sharp from 'sharp';
import { SITE, FEED_URL, LATEST } from '../src/comms-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANNOUNCE_DIR = path.join(ROOT, 'src/content/announcements');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const CHANGELOG_DIR = path.join(ROOT, 'src/content/changelog');
const OUT_DIR = process.env.APP_COMMS_OUT ?? path.join(ROOT, 'dist/app');
const ID_LOCK = path.join(ROOT, 'comms-ids.json');
const MAX_IMAGE_WIDTH = 1600;

// Every enum the contract defines. Unknown values fold to a default in the
// app rather than dropping the entry, but a typo here is still a typo.
const KINDS = new Set(['release', 'blog', 'notice', 'event']);
const PRIORITIES = new Set(['normal', 'pinned']);
const STYLES = new Set(['primary', 'secondary']);
const PLATFORMS = new Set(['windows', 'macos', 'linux', 'ios', 'android']);

const problems = [];
const fail = (msg) => problems.push(msg);

// ---------------------------------------------------------------------------
// Eastern wall-clock -> absolute UTC instant.
//
// Authors write Eastern local time; the app has no timezone database and only
// ever compares absolute instants. Doing the conversion here, where a real tz
// database exists, is what makes a scheduled post go live at the same moment
// in Tokyo and in Vancouver, with DST handled correctly and forever.

const ZONE = 'America/New_York';

const partsFmt = new Intl.DateTimeFormat('en-US', {
	timeZone: ZONE,
	hour12: false,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
});

const displayFmt = new Intl.DateTimeFormat('en-US', {
	timeZone: ZONE,
	year: 'numeric',
	month: 'long',
	day: 'numeric',
});

function zonedParts(ms) {
	const p = Object.fromEntries(partsFmt.formatToParts(ms).map((x) => [x.type, x.value]));
	// Some ICU builds render midnight as hour 24 under hour12:false.
	return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}

/** Offset of ZONE from UTC at a given instant, in ms (local - utc). */
function zoneOffsetMs(ms) {
	const p = zonedParts(ms);
	return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - ms;
}

/**
 * Parse "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" as Eastern wall-clock time and
 * return the absolute instant. A date with no time means 09:00 Eastern.
 */
function easternToInstant(text, where, field) {
	if (text instanceof Date) {
		fail(
			`${where}: ${field} was read as a date by YAML, which reinterprets the wall time as ` +
				`UTC and moves the entry by several hours. Quote it: ${field}: "YYYY-MM-DD HH:MM".`,
		);
		return null;
	}
	const m = String(text).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
	if (!m) {
		fail(`${where}: ${field} "${text}" is not "YYYY-MM-DD" or "YYYY-MM-DD HH:MM".`);
		return null;
	}
	const [y, mo, d] = [+m[1], +m[2], +m[3]];
	const [h, mi] = m[4] === undefined ? [9, 0] : [+m[4], +m[5]];
	if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) {
		fail(`${where}: ${field} "${text}" is not a real date and time.`);
		return null;
	}

	// Treat the wall time as UTC, then walk it back by the zone's offset at the
	// instant we land on. Two passes settle it either side of a DST boundary.
	const naive = Date.UTC(y, mo - 1, d, h, mi);
	let ms = naive;
	for (let i = 0; i < 3; i++) ms = naive - zoneOffsetMs(ms);

	// Round-trip check. The one input this cannot represent is a time inside the
	// spring-forward gap, which never happens in Eastern and so must not be
	// quietly rounded into an hour the author did not write.
	const back = zonedParts(ms);
	if (back.y !== y || back.mo !== mo || back.d !== d || back.h !== h || back.mi !== mi) {
		fail(
			`${where}: ${field} "${text}" does not exist in ${ZONE} ` +
				`(it falls in the daylight-saving spring-forward gap). Pick another time.`,
		);
		return null;
	}
	return ms;
}

/** ISO 8601 with an explicit UTC offset. An offset-less stamp is rejected by the app. */
const toIsoZ = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

// ---------------------------------------------------------------------------
// Frontmatter

function readMarkdown(file) {
	const raw = fs.readFileSync(file, 'utf8');
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) {
		fail(`${path.relative(ROOT, file)}: no frontmatter block.`);
		return null;
	}
	let data;
	try {
		data = parseYaml(match[1]);
	} catch (err) {
		fail(`${path.relative(ROOT, file)}: unreadable frontmatter (${err.message}).`);
		return null;
	}
	if (!data || typeof data !== 'object') {
		fail(`${path.relative(ROOT, file)}: frontmatter is not a mapping.`);
		return null;
	}
	return { data, body: raw.slice(match[0].length) };
}

const listFiles = (dir) =>
	fs.existsSync(dir)
		? fs
				.readdirSync(dir)
				.filter((f) => f.endsWith('.md'))
				.sort()
				.map((f) => path.join(dir, f))
		: [];

// ---------------------------------------------------------------------------
// Images. Deduped on resolved source path, capped at app-reader width, encoded
// twice and kept at whichever is smaller. Same tier as the docs export: this
// is the difference between an image arriving in ~100 KB and in several MB.

const imageJobs = new Map();

function resolveImageSource(src, mdFile) {
	if (src.startsWith('~/')) return path.join(ROOT, 'src', src.slice(2));
	if (src.startsWith('/')) return path.join(ROOT, 'public', src);
	return path.resolve(path.dirname(mdFile), src);
}

function processImage(src, mdFile) {
	const abs = resolveImageSource(src, mdFile);
	if (!imageJobs.has(abs)) {
		imageJobs.set(
			abs,
			(async () => {
				if (!fs.existsSync(abs)) {
					throw new Error(`Image not found: ${src} (from ${path.relative(ROOT, mdFile)})`);
				}
				const base = sharp(abs).resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true });
				const [near, lossy] = await Promise.all([
					base.clone().webp({ nearLossless: true, effort: 6 }).toBuffer(),
					base.clone().webp({ quality: 85, effort: 6 }).toBuffer(),
				]);
				const buffer = near.length <= lossy.length ? near : lossy;
				const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 8);
				const name = path.basename(abs).replace(/\.[a-z0-9]+$/i, '');
				// Feed-relative, because that is the only form the app can resolve.
				const relPath = `comms/img/${name}.${hash}.webp`;
				fs.writeFileSync(path.join(OUT_DIR, relPath), buffer);
				return { path: relPath, bytes: buffer.length };
			})(),
		);
	}
	return imageJobs.get(abs);
}

// ---------------------------------------------------------------------------
// Body markdown -> app dialect.
//
// The reader renders CommonMark with the same style map as the documentation
// reader. Two rewrites matter: image sources, which are meaningless to a
// Flutter client unless they point at an emitted derivative, and site-relative
// links, which have no origin to resolve against.

async function transformBody(body, file) {
	const out = [];
	const pending = [];
	let inFence = false;

	for (const rawLine of body.split(/\r?\n/)) {
		let line = rawLine;

		if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
		if (inFence || /^(```|~~~)/.test(line.trim())) {
			out.push(line);
			continue;
		}

		// Announcements are plain markdown. Anything Astro- or Starlight-specific
		// would render as literal text in the app, so it fails the build instead.
		if (/^import\s.+\sfrom\s.+;?\s*$/.test(line) || /^\s*<\/?[A-Z]/.test(line)) {
			fail(
				`${path.relative(ROOT, file)}: "${line.trim().slice(0, 40)}" has no app ` +
					`serialization. Announcement bodies are plain markdown only.`,
			);
			continue;
		}
		const aside = line.match(/^:::([a-z-]+)/);
		if (aside) {
			fail(
				`${path.relative(ROOT, file)}: ":::${aside[1]}" blocks are a Starlight feature ` +
					`and have no app serialization. Use a blockquote.`,
			);
			continue;
		}

		// Images first, so their sources are not caught by the link rewrite below.
		line = line.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => {
			if (/^https?:\/\//.test(src)) return m;
			const token = ` img${pending.length} `;
			pending.push({ token, promise: processImage(src, file) });
			return `![${alt}](${token})`;
		});
		// Site-relative links become absolute: the app has no origin to resolve
		// them against, and a bare /blog/... would open nothing.
		line = line.replace(/\]\((\/[^)]+)\)/g, `](${SITE}$1)`);

		out.push(line);
	}

	let text = out.join('\n');
	for (const { token, promise } of pending) {
		try {
			text = text.replace(token, (await promise).path);
		} catch (err) {
			fail(`${path.relative(ROOT, file)}: ${err.message}`);
		}
	}
	return text.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '\n');
}

// ---------------------------------------------------------------------------
// Actions

function normalizeActions(raw, where) {
	if (raw === undefined || raw === null) return [];
	if (!Array.isArray(raw)) {
		fail(`${where}: actions must be a list.`);
		return [];
	}
	const actions = [];
	for (const [i, a] of raw.entries()) {
		if (!a || typeof a !== 'object') {
			fail(`${where}: action ${i + 1} is not a mapping.`);
			continue;
		}
		if (!a.label || !a.url) {
			fail(`${where}: action ${i + 1} needs both a label and a url (the app drops it otherwise).`);
			continue;
		}
		if (!/^https?:\/\/\S+$/.test(a.url)) {
			fail(`${where}: action ${i + 1} url "${a.url}" must be an absolute http(s) URL.`);
			continue;
		}
		const style = a.style ?? 'secondary';
		if (!STYLES.has(style)) {
			fail(`${where}: action ${i + 1} style "${style}" is not primary or secondary.`);
			continue;
		}
		actions.push({ label: String(a.label), url: String(a.url), style });
	}
	if (actions.length > 3) {
		fail(`${where}: ${actions.length} actions, but the app renders only the first 3.`);
	}
	return actions;
}

// ---------------------------------------------------------------------------
// Build

fs.rmSync(path.join(OUT_DIR, 'comms'), { recursive: true, force: true });
fs.rmSync(path.join(OUT_DIR, 'comms.json'), { force: true });
fs.mkdirSync(path.join(OUT_DIR, 'comms/img'), { recursive: true });

const items = [];

// -- Announcements ----------------------------------------------------------

for (const file of listFiles(ANNOUNCE_DIR)) {
	const where = path.relative(ROOT, file);
	const parsed = readMarkdown(file);
	if (!parsed) continue;
	const { data, body } = parsed;
	if (data.draft === true) continue;

	if (!data.id || !/^[a-z0-9-]+$/.test(String(data.id))) {
		fail(`${where}: id "${data.id ?? ''}" must be a lowercase slug. It is the app's read-state key.`);
		continue;
	}
	if (!data.title) {
		fail(`${where}: no title (the app skips titleless entries).`);
		continue;
	}
	if (data.date === undefined) {
		fail(`${where}: no date.`);
		continue;
	}
	const publishedMs = easternToInstant(data.date, where, 'date');
	if (publishedMs === null) continue;

	const kind = data.kind ?? 'notice';
	if (!KINDS.has(kind)) fail(`${where}: kind "${kind}" is not one of ${[...KINDS].join(', ')}.`);
	const priority = data.priority ?? 'normal';
	if (!PRIORITIES.has(priority)) fail(`${where}: priority "${priority}" is not normal or pinned.`);

	const item = {
		id: String(data.id),
		kind,
		priority,
		title: String(data.title),
		publishedAt: toIsoZ(publishedMs),
		displayDate: displayFmt.format(publishedMs),
		summary: data.summary ? String(data.summary) : '',
	};

	// Short markdown rendered straight into the card.
	if (data.inline) item.body = String(data.inline).trim();

	// The file's own markdown becomes the fetched-on-open body. Most cards are
	// read as a card and never expanded, so this is not downloaded until it is.
	const transformed = body.trim() ? await transformBody(body, file) : '';
	if (transformed.trim()) {
		const md = `# ${item.title}\n\n${transformed}`;
		const hash = createHash('sha256').update(md).digest('hex').slice(0, 8);
		item.path = `comms/${item.id}.${hash}.md`;
		fs.writeFileSync(path.join(OUT_DIR, item.path), md);
	}

	item.actions = normalizeActions(data.actions, where);

	if (data.requiresVersion !== undefined && data.requiresVersion !== null) {
		const rv = String(data.requiresVersion);
		if (!/^\d+\.\d+\.\d+$/.test(rv)) {
			fail(`${where}: requiresVersion "${rv}" must be a quoted three-part version.`);
		}
		item.requiresVersion = rv;
	} else {
		item.requiresVersion = null;
	}

	if (data.platforms !== undefined && data.platforms !== null) {
		if (!Array.isArray(data.platforms) || data.platforms.length === 0) {
			// The app reads an empty array as "all" rather than hiding the post
			// everywhere, but an empty array here is a bug worth stopping for.
			fail(`${where}: platforms must be a non-empty list, or omitted for all platforms.`);
		} else {
			for (const p of data.platforms) {
				if (!PLATFORMS.has(p)) fail(`${where}: unknown platform "${p}".`);
			}
			item.platforms = data.platforms.map(String);
		}
	} else {
		item.platforms = null;
	}

	if (data.expires !== undefined && data.expires !== null) {
		const expiresMs = easternToInstant(data.expires, where, 'expires');
		if (expiresMs !== null) {
			if (expiresMs <= publishedMs) {
				fail(`${where}: expires "${data.expires}" is not after date "${data.date}".`);
			}
			item.expires = toIsoZ(expiresMs);
		}
	} else {
		item.expires = null;
	}

	items.push(item);
}

// -- Blog posts opted in with `announce: true` ------------------------------

for (const file of listFiles(BLOG_DIR)) {
	const where = path.relative(ROOT, file);
	const parsed = readMarkdown(file);
	if (!parsed) continue;
	const { data } = parsed;
	if (data.announce !== true || data.draft === true) continue;

	const slug = path.basename(file, '.md');
	if (data.date === undefined) {
		fail(`${where}: announce: true but no date.`);
		continue;
	}
	const time = data.announceTime ? String(data.announceTime) : '09:00';
	if (!/^\d{2}:\d{2}$/.test(time)) {
		fail(`${where}: announceTime "${time}" must be "HH:MM" (Eastern).`);
		continue;
	}
	// Blog posts write `date: 2026-08-06` unquoted, which YAML resolves to a
	// Date at UTC midnight. Read the calendar day back out in UTC, so the day
	// the author typed is the day the announcement carries.
	const day =
		data.date instanceof Date
			? data.date.toISOString().slice(0, 10)
			: String(data.date).slice(0, 10);
	const publishedMs = easternToInstant(`${day} ${time}`, where, 'date');
	if (publishedMs === null) continue;

	const kind = data.announceKind ?? 'blog';
	if (!KINDS.has(kind)) fail(`${where}: announceKind "${kind}" is not one of ${[...KINDS].join(', ')}.`);
	const priority = data.announcePriority ?? 'normal';
	if (!PRIORITIES.has(priority)) fail(`${where}: announcePriority "${priority}" is not normal or pinned.`);

	// The post lives on the web and is written for the web: images, video
	// embeds and all. It is announced in the app and read in a browser, so it
	// carries an action rather than an in-app body.
	const actions = data.announceActions
		? normalizeActions(data.announceActions, where)
		: [{ label: 'Read the devlog', url: `${SITE}/blog/${slug}`, style: 'primary' }];

	items.push({
		id: slug,
		kind,
		priority,
		title: String(data.title ?? ''),
		publishedAt: toIsoZ(publishedMs),
		displayDate: displayFmt.format(publishedMs),
		summary: data.description ? String(data.description) : '',
		actions,
		requiresVersion: null,
		platforms: null,
		expires: null,
	});
	if (!data.title) fail(`${where}: announce: true but no title.`);
}

// -- Changelog --------------------------------------------------------------

const changelog = [];
for (const file of listFiles(CHANGELOG_DIR)) {
	const where = path.relative(ROOT, file);
	const parsed = readMarkdown(file);
	if (!parsed) continue;
	const { data, body } = parsed;
	if (data.draft === true) continue;

	const version = String(data.version ?? '');
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		fail(`${where}: version "${version}" must be a quoted three-part version.`);
		continue;
	}
	if (data.date === undefined) {
		fail(`${where}: no date.`);
		continue;
	}
	const ms = easternToInstant(data.date, where, 'date');
	if (ms === null) continue;

	const text = body.trim();
	if (!text) {
		fail(`${where}: empty body (the app skips changelog entries with no body).`);
		continue;
	}
	// The app's parseChangelog accepts headings, paragraphs and bullet lists.
	// Nothing else: no links, no emphasis, no code. Anything richer renders as
	// literal punctuation in the release-notes sheet.
	for (const [i, line] of text.split('\n').entries()) {
		const at = `${where}:${i + 1}`;
		if (/\[[^\]]*\]\([^)]*\)/.test(line)) fail(`${at}: changelog bodies cannot contain links.`);
		if (/`/.test(line)) fail(`${at}: changelog bodies cannot contain code spans.`);
		if (/(\*\*|__|(^|\s)[*_]\S)/.test(line) && !/^\s*[-*]\s/.test(line)) {
			fail(`${at}: changelog bodies cannot contain emphasis.`);
		}
	}

	changelog.push({ version, displayDate: displayFmt.format(ms), sort: ms, body: text });
}
// Newest first, so a version newer than the running build lands at the top.
changelog.sort((a, b) => b.sort - a.sort);
for (const c of changelog) delete c.sort;

// -- latest -----------------------------------------------------------------

let latest = null;
if (LATEST) {
	if (!/^\d+\.\d+\.\d+$/.test(LATEST.version ?? '')) {
		fail(`src/comms-config.mjs: LATEST.version must be a three-part version.`);
	} else if (!/^https?:\/\/\S+$/.test(LATEST.url ?? '')) {
		fail(`src/comms-config.mjs: LATEST.url must be an absolute http(s) URL.`);
	} else if (!PRIORITIES.has(LATEST.priority ?? 'normal')) {
		fail(`src/comms-config.mjs: LATEST.priority must be normal or pinned.`);
	} else {
		latest = {
			version: LATEST.version,
			headline: LATEST.headline ?? '',
			url: LATEST.url,
			priority: LATEST.priority ?? 'normal',
		};
	}
}

// -- Assemble ---------------------------------------------------------------

// Newest first. Pinned items get their own group in the app, so the sort here
// is purely chronological and the app does the grouping.
items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));

let gitShort = 'nogit';
try {
	gitShort = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
} catch {}
// Changes on every publish, which is the one thing the app requires of it.
const version = `${new Date().toISOString().replace(/:/g, '-').replace(/\..*/, 'Z')}-${gitShort}`;

const feed = {
	schema: 1,
	version,
	feedUrl: FEED_URL,
	...(latest ? { latest } : {}),
	items,
	...(changelog.length ? { changelog } : {}),
};

// ---------------------------------------------------------------------------
// Contract checks. Every rule here is one the app enforces on its side by
// dropping something. Failing the build beats publishing a feed that is
// quietly missing an entry nobody notices for a fortnight.

const seen = new Map();
for (const item of items) {
	if (seen.has(item.id)) {
		fail(
			`Duplicate item id "${item.id}" (${seen.get(item.id)} and this one). Ids are the app's ` +
				`read-state key: the second entry would suppress the first.`,
		);
	}
	seen.set(item.id, item.title);
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.publishedAt)) {
		fail(`${item.id}: publishedAt "${item.publishedAt}" has no explicit UTC offset.`);
	}
	if (item.path && !fs.existsSync(path.join(OUT_DIR, item.path))) {
		fail(`${item.id}: body ${item.path} was not written.`);
	}
	if (item.path && !/^comms\/[a-z0-9-]+\.[0-9a-f]{8}\.md$/.test(item.path)) {
		fail(`${item.id}: bad body path "${item.path}".`);
	}
}

// Emitted bodies must not reference an image by anything but a feed-relative
// emitted path. This is the easiest requirement in the contract to miss and
// the one that silently produces a card full of grey boxes.
for (const item of items) {
	if (!item.path) continue;
	const md = fs.readFileSync(path.join(OUT_DIR, item.path), 'utf8');
	for (const m of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
		const src = m[1];
		if (/^https?:\/\//.test(src)) continue;
		if (!/^comms\/img\/[^/]+\.[0-9a-f]{8}\.webp$/.test(src)) {
			fail(`${item.id}: image reference "${src}" is not a feed-relative emitted path.`);
		}
	}
}

if (problems.length) {
	console.error(`\ncomms feed: ${problems.length} problem(s)\n`);
	for (const p of problems) console.error(`  - ${p}`);
	console.error('');
	process.exit(1);
}

fs.writeFileSync(path.join(OUT_DIR, 'comms.json'), JSON.stringify(feed, null, '\t') + '\n');

// ---------------------------------------------------------------------------
// Id ledger. Ids are permanent read-state keys in shipped apps. Retiring an
// old post is legitimate, so this warns rather than fails, but a rename shows
// up here as one id vanishing and another appearing in the same build.

const shipped = fs.existsSync(ID_LOCK) ? JSON.parse(fs.readFileSync(ID_LOCK, 'utf8')) : [];
const gone = shipped.filter((id) => !seen.has(id));
if (gone.length) {
	console.warn(
		`comms feed: id(s) [${gone.join(', ')}] shipped before and are absent from this build. ` +
			`Fine if the post was retired; if it was renamed, restore the old id (everyone who ` +
			`read it will be re-notified otherwise) and remove it from comms-ids.json deliberately.`,
	);
}
fs.writeFileSync(
	ID_LOCK,
	JSON.stringify([...new Set([...shipped, ...seen.keys()])].sort(), null, '\t') + '\n',
);

const images = await Promise.allSettled([...imageJobs.values()]);
const imageBytes = images.reduce((s, r) => s + (r.value?.bytes ?? 0), 0);
const bodyBytes = items.reduce(
	(s, i) => s + (i.path ? fs.statSync(path.join(OUT_DIR, i.path)).size : 0),
	0,
);
const feedBytes = fs.statSync(path.join(OUT_DIR, 'comms.json')).size;
console.log(
	`comms feed: ${items.length} items (${(feedBytes / 1024).toFixed(1)} KB), ` +
		`${items.filter((i) => i.path).length} bodies (${(bodyBytes / 1024).toFixed(1)} KB), ` +
		`${imageJobs.size} images (${(imageBytes / 1024).toFixed(0)} KB), ` +
		`${changelog.length} changelog entries -> ${path.relative(ROOT, OUT_DIR)}`,
);
