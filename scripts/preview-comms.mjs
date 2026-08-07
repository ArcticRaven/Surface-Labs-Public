// Shows what the app would actually render from the built feed, by applying
// the client's own rules: the publish gate, expiry, platform filtering and
// pinned grouping. Read the feed, do not trust the source files.
//
//   node scripts/preview-comms.mjs [--platform windows] [--version 1.2.2] [--at 2026-08-20T13:00:00Z]
//
// Run it before pushing a batch of scheduled posts. "Six items in the feed"
// and "six items on screen" are different claims, and this is the one that
// matters.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEED = process.env.APP_COMMS_OUT
	? path.join(process.env.APP_COMMS_OUT, 'comms.json')
	: path.join(ROOT, 'dist/app/comms.json');

const arg = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? fallback : process.argv[i + 1];
};

if (!fs.existsSync(FEED)) {
	console.error(`No feed at ${path.relative(ROOT, FEED)}. Run: npm run build:comms`);
	process.exit(1);
}

const feed = JSON.parse(fs.readFileSync(FEED, 'utf8'));
const platform = arg('platform', 'windows');
const running = arg('version', null);
const now = Date.parse(arg('at', new Date().toISOString()));

const cmp = (a, b) => {
	const pa = String(a).replace(/^v/, '').split('+')[0].split('.').map(Number);
	const pb = String(b).replace(/^v/, '').split('+')[0].split('.').map(Number);
	if (pa.concat(pb).some(Number.isNaN)) return 0;
	for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
	return 0;
};

console.log(
	`feed ${feed.version}\n` +
		`as ${platform}${running ? ` on ${running}` : ''} at ${new Date(now).toISOString()}\n`,
);

if (feed.latest) {
	const shows = running ? cmp(feed.latest.version, running) > 0 : 'unknown running version';
	console.log(
		`update notice: ${feed.latest.version} (${feed.latest.priority}) -> ` +
			(shows === true ? 'PILL SHOWS' : shows === false ? 'hidden (not newer)' : shows),
	);
	if (shows === true && feed.latest.priority === 'pinned') console.log('  + one-time toast');
	console.log('');
}

const visible = [];
const hidden = [];
for (const item of feed.items) {
	const published = Date.parse(item.publishedAt);
	const expires = item.expires ? Date.parse(item.expires) : null;
	// An empty platforms array reads as "all": hiding the post everywhere is
	// the worse failure.
	const plats = item.platforms?.length ? item.platforms : null;
	if (published > now) hidden.push([item, `scheduled for ${item.publishedAt}`]);
	else if (expires !== null && expires <= now) hidden.push([item, `expired ${item.expires}`]);
	else if (plats && !plats.includes(platform)) hidden.push([item, `${plats.join('/')} only`]);
	else visible.push(item);
}

const groups = [
	['Pinned', visible.filter((i) => i.priority === 'pinned')],
	...[...new Set(visible.filter((i) => i.priority !== 'pinned').map((i) => i.displayDate))].map(
		(d) => [d, visible.filter((i) => i.priority !== 'pinned' && i.displayDate === d)],
	),
];

for (const [label, group] of groups) {
	if (!group.length) continue;
	console.log(`── ${label}`);
	for (const i of group) {
		const tags = [
			i.kind,
			i.requiresVersion ? `requires ${i.requiresVersion}` : null,
			i.body ? 'inline body' : null,
			i.path ? 'fetched body' : null,
			i.actions?.length ? `${i.actions.length} action(s)` : null,
		].filter(Boolean);
		console.log(`   ${i.title}`);
		console.log(`     ${tags.join(' · ')}`);
	}
	console.log('');
}

console.log(`${visible.length} visible, ${hidden.length} hidden:`);
for (const [i, why] of hidden) console.log(`   ${i.id}: ${why}`);

if (feed.changelog?.length) {
	console.log(`\nchangelog entries: ${feed.changelog.map((c) => c.version).join(', ')}`);
	if (running) {
		const newer = feed.changelog.filter((c) => cmp(c.version, running) > 0).map((c) => c.version);
		if (newer.length) console.log(`   not installed on ${running}: ${newer.join(', ')}`);
	}
}
