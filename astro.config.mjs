// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

// Canonical production origin. Used for the sitemap, canonical URLs and
// absolute Open Graph / Twitter metadata.
const SITE = 'https://surfacelabs.app';

// External links referenced across the site.
const REPO_URL = 'https://github.com/ArcticRaven/Surface-Labs-Public';

// Absolute URL for the default social share image.
const OG_IMAGE = `${SITE}/images/og.png`;

// https://astro.build/config
export default defineConfig({
	site: SITE,
	// The custom marketing homepage lives at src/pages/index.astro. Starlight
	// serves the documentation collection; every docs entry is nested under a
	// `docs/` folder so it is routed beneath /docs/ and never claims `/`.
	integrations: [
		starlight({
			title: 'Surface Labs',
			description:
				'Documentation for Surface Labs, a node-based procedural texture authoring application.',
			// The site ships a custom, marketing-styled 404 at src/pages/404.astro,
			// so Starlight's built-in 404 route is disabled to avoid a route collision.
			disable404Route: true,
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
			// Global metadata applied to every documentation page. Starlight already
			// emits <title>, canonical, description, og:title/description and
			// twitter:card; these entries add the shared social image.
			head: [
				// The docs are not linked from the marketing site yet and are kept out
				// of search results until they are ready. Remove this to publish them.
				{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, follow' } },
				{ tag: 'meta', attrs: { property: 'og:image', content: OG_IMAGE } },
				{
					tag: 'meta',
					attrs: {
						property: 'og:image:alt',
						content: 'Surface Labs — node-based procedural texture authoring',
					},
				},
				{ tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
			],
			customCss: ['./src/styles/starlight-theme.css'],
			sidebar: [
				{
					label: 'Documentation',
					items: [
						{ label: 'Overview', slug: 'docs' },
						{ label: 'Getting Started', slug: 'docs/getting-started' },
						{ label: 'Features', slug: 'docs/features' },
						{ label: 'Nodes', slug: 'docs/nodes' },
						{ label: 'FAQ', slug: 'docs/faq' },
						{ label: 'Changelog', slug: 'docs/changelog' },
						{ label: 'Support', slug: 'docs/support' },
					],
				},
			],
		}),
		// Keep /docs/* out of the sitemap while the docs are unpublished.
		sitemap({ filter: (page) => !page.includes('/docs') }),
	],
});
