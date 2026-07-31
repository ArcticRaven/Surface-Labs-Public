import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

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
		}),
	}),
};
