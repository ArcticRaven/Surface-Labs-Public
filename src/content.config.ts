import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/**
 * Eastern wall-clock timestamp, authored as a quoted string: "YYYY-MM-DD" or
 * "YYYY-MM-DD HH:MM". The comms build converts it to an absolute UTC instant
 * (`publishedAt`) with a real timezone database, so a scheduled post goes live
 * at the same moment for every reader on earth.
 *
 * It must be quoted. Unquoted, YAML may hand back a Date, which would silently
 * reinterpret the wall time as UTC and move the post by five hours.
 */
const easternTimestamp = z
	.string({
		error: 'Must be a quoted string, e.g. "2026-08-20 09:00" (Eastern wall-clock time).',
	})
	.regex(
		/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2})?$/,
		'Expected "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" (Eastern wall-clock time).',
	);

/** A button on an in-app card. The app renders the first three. */
const commsAction = z.object({
	label: z.string(),
	url: z.string().regex(/^https?:\/\/\S+$/, 'Must be an absolute http(s) URL.'),
	style: z.enum(['primary', 'secondary']).default('secondary'),
});

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	// Marketing blog / devlog. One Markdown file per post under src/content/blog;
	// the filename (without extension) becomes the URL slug under /blog/.
	blog: defineCollection({
		loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			/** Publish date (YYYY-MM-DD in frontmatter). */
			date: z.coerce.date(),
			author: z.string().default('Arctic'),
			tags: z.array(z.string()).default([]),
			/** Hide from the index and listings while still building it. */
			draft: z.boolean().default(false),

			// -- In-app announcement opt-in (see scripts/COMMS_AUTHORING.md) --
			/**
			 * Push this post to the app's News card. The post's slug becomes the
			 * feed id and is permanent from the moment it ships.
			 */
			announce: z.boolean().default(false),
			/** Card glyph. Defaults to `blog`. */
			announceKind: z.enum(['release', 'blog', 'notice', 'event']).default('blog'),
			/** `pinned` sorts to the top of the feed in its own group. */
			announcePriority: z.enum(['normal', 'pinned']).default('normal'),
			/**
			 * Time of day the announcement goes live, Eastern. The post's own
			 * `date` supplies the day.
			 */
			announceTime: z
				.string()
				.regex(/^\d{2}:\d{2}$/, 'Expected "HH:MM" (Eastern).')
				.default('09:00'),
			/**
			 * Buttons on the card. Defaults to a single primary "Read the devlog"
			 * pointing at the post.
			 */
			announceActions: z.array(commsAction).optional(),
		}),
	}),

	/**
	 * In-app announcements. Never rendered publicly: there is no route for this
	 * collection, it exists only as the source for /app/comms.json.
	 */
	announcements: defineCollection({
		loader: glob({ pattern: '**/*.md', base: './src/content/announcements' }),
		schema: z.object({
			/**
			 * Stable slug, and the app's read-state key. Never rename or reuse a
			 * shipped id: renaming re-notifies everyone who already read the post,
			 * reusing silently suppresses the new one.
			 */
			id: z.string().regex(/^[a-z0-9-]+$/),
			title: z.string(),
			/** When it goes live, Eastern. May be in the future; the app schedules it. */
			date: easternTimestamp,
			kind: z.enum(['release', 'blog', 'notice', 'event']).default('notice'),
			priority: z.enum(['normal', 'pinned']).default('normal'),
			/** One sentence under the title. */
			summary: z.string().default(''),
			/** Short markdown rendered directly in the card, above the read action. */
			inline: z.string().optional(),
			actions: z.array(commsAction).default([]),
			/**
			 * There is deliberately no version field. The feed reaches every
			 * version of the app, and nothing in it is gated on or labelled with
			 * the build the reader is running.
			 */
			/** Restrict to these platforms. Absent means all. This *is* a filter. */
			platforms: z.array(z.enum(['windows', 'macos', 'linux', 'ios', 'android'])).optional(),
			/** Stop showing it after this Eastern timestamp. */
			expires: easternTimestamp.optional(),
			/** Keep it out of the feed entirely while it is being written. */
			draft: z.boolean().default(false),
		}),
	}),

	/**
	 * Release notes, merged over the copy bundled in the app. One file per
	 * version. Also never rendered publicly.
	 */
	changelog: defineCollection({
		loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
		schema: z.object({
			/** Three-part version, quoted. Also the merge key. */
			version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Expected a quoted version, e.g. "1.2.2".'),
			/** Release date, Eastern. Sorts the entry and supplies its display date. */
			date: easternTimestamp,
			draft: z.boolean().default(false),
		}),
	}),
};
