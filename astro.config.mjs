// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { docsSidebar } from './src/docs-sidebar.mjs';
import remarkAppTokens from './src/plugins/remark-app-tokens.mjs';

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
	// Disable Astro's default Shiki highlighter for standalone Markdown (the
	// blog). Shiki bakes a fixed dark background into every code block, which
	// clashes with the light (parchment) theme. Blog code blocks are styled
	// theme-aware in home.css instead. Starlight docs use Expressive Code and
	// are unaffected by this setting.
	markdown: {
		syntaxHighlight: false,
		// Renders the app's platform tokens ({{mod}}, {{rightclick}}, ...) into
		// neutral wording for web readers. The in-app docs bundle receives them
		// verbatim instead; see scripts/build-app-docs.mjs.
		remarkPlugins: [remarkAppTokens],
	},
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
			favicon: '/favicon.png',
			social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
			// Global metadata applied to every documentation page. Starlight already
			// emits <title>, canonical, description, og:title/description and
			// twitter:card; these entries add the shared social image.
			head: [
				{ tag: 'meta', attrs: { property: 'og:image', content: OG_IMAGE } },
				{
					tag: 'meta',
					attrs: {
						property: 'og:image:alt',
						content: 'Surface Labs, node-based procedural texture authoring',
					},
				},
				{ tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
			],
			customCss: ['./src/styles/starlight-theme.css'],
			sidebar: docsSidebar,
		}),
		sitemap(),
	],
});
