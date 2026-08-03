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
	// Disable Astro's default Shiki highlighter for standalone Markdown (the
	// blog). Shiki bakes a fixed dark background into every code block, which
	// clashes with the light (parchment) theme. Blog code blocks are styled
	// theme-aware in home.css instead. Starlight docs use Expressive Code and
	// are unaffected by this setting.
	markdown: {
		syntaxHighlight: false,
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
						content: 'Surface Labs — node-based procedural texture authoring',
					},
				},
				{ tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
			],
			customCss: ['./src/styles/starlight-theme.css'],
			sidebar: [
				{
					label: 'Start Here',
					items: [
						{ label: 'Overview', slug: 'docs' },
						{ label: 'Install & Platforms', slug: 'docs/install-and-platforms' },
						{ label: 'Your First Material', slug: 'docs/first-material' },
						{ label: 'Interface Tour', slug: 'docs/interface-tour' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'How Evaluation Works', slug: 'docs/concepts/evaluation' },
						{
							label: 'Resolution & Bit Depth',
							slug: 'docs/concepts/resolution-and-bit-depth',
						},
						{ label: 'Data Types & Ports', slug: 'docs/concepts/data-types' },
					],
				},
				{
					label: 'The Editor',
					collapsed: true,
					items: [
						{ label: 'Project Hub', slug: 'docs/editor/project-hub' },
						{ label: 'Editor Layout & Panels', slug: 'docs/editor/layout' },
						{ label: 'The Canvas', slug: 'docs/editor/canvas' },
						{ label: 'Properties Panel', slug: 'docs/editor/properties' },
						{ label: 'Input Devices', slug: 'docs/editor/input-devices' },
						{ label: 'Keyboard Shortcuts', slug: 'docs/editor/shortcuts' },
					],
				},
				{
					label: 'Building Graphs',
					collapsed: true,
					items: [
						{ label: 'Adding & Arranging Nodes', slug: 'docs/graphs/adding-nodes' },
						{ label: 'Connections & Reroutes', slug: 'docs/graphs/connections' },
						{ label: 'Multi-Output Nodes', slug: 'docs/graphs/multi-output' },
						{ label: 'Selection & Undo', slug: 'docs/graphs/selection-and-undo' },
						{ label: 'Comments & Annotations', slug: 'docs/graphs/comments' },
						{ label: 'Subgraphs', slug: 'docs/graphs/subgraphs' },
						{
							label: 'Exposed Parameters & Globals',
							slug: 'docs/graphs/exposed-parameters',
						},
						{ label: 'Multi-Material Projects', slug: 'docs/graphs/multi-material' },
					],
				},
				{
					label: 'Node Reference',
					collapsed: true,
					items: [
						{ label: 'Overview', slug: 'docs/nodes/overview' },
						{ label: 'Generators', slug: 'docs/nodes/generators' },
						{ label: 'Inputs', slug: 'docs/nodes/inputs' },
						{ label: 'Transform', slug: 'docs/nodes/transform' },
						{ label: 'Filters', slug: 'docs/nodes/filters' },
						{ label: 'Simulation & Compute', slug: 'docs/nodes/simulation' },
						{ label: 'Normal & Surface', slug: 'docs/nodes/normal' },
						{ label: 'Blend', slug: 'docs/nodes/blend' },
						{ label: 'Math', slug: 'docs/nodes/math' },
						{ label: 'Channels', slug: 'docs/nodes/channels' },
						{ label: 'Histogram', slug: 'docs/nodes/histogram' },
						{ label: 'Flood Fill', slug: 'docs/nodes/flood-fill' },
						{ label: 'Outputs', slug: 'docs/nodes/outputs' },
					],
				},
				{
					label: 'Custom Shaders',
					collapsed: true,
					items: [
						{
							label: 'The Custom Shader Node',
							slug: 'docs/shaders/custom-shader-node',
						},
						{
							label: 'Declaring Ports & Parameters',
							slug: 'docs/shaders/ports-and-parameters',
						},
						{ label: 'SL Language Reference', slug: 'docs/shaders/sl-reference' },
						{ label: 'Writing GLSL Directly', slug: 'docs/shaders/glsl' },
						{
							label: 'The Shader Editor & Diagnostics',
							slug: 'docs/shaders/editor-and-diagnostics',
						},
					],
				},
				{
					label: 'Preview & Export',
					collapsed: true,
					items: [
						{ label: '2D Preview', slug: 'docs/export/preview-2d' },
						{ label: '3D Material Preview', slug: 'docs/export/preview-3d' },
						{ label: 'Exporting Textures', slug: 'docs/export/exporting' },
						{ label: 'Export Presets & Engine Targets', slug: 'docs/export/presets' },
						{ label: 'Bit Depth & EXR', slug: 'docs/export/bit-depth-and-exr' },
					],
				},
				{
					label: 'Automation',
					items: [
						{ label: 'MCP Server', slug: 'docs/mcp-server' },
						{ label: 'Command Line', slug: 'docs/headless-cli' },
					],
				},
				{
					label: 'Help',
					collapsed: true,
					items: [
						{ label: 'Project & File Formats', slug: 'docs/help/file-formats' },
						{
							label: 'Autosave & Recovery',
							slug: 'docs/help/autosave-and-recovery',
						},
						{ label: 'Sharing Nodes', slug: 'docs/help/sharing-nodes' },
						{ label: 'Settings', slug: 'docs/help/settings' },
						{
							label: 'Performance & Memory',
							slug: 'docs/help/performance-and-memory',
						},
						{ label: 'Troubleshooting', slug: 'docs/help/troubleshooting' },
						{ label: 'Glossary', slug: 'docs/help/glossary' },
						{ label: 'FAQ', slug: 'docs/faq' },
						{ label: 'Support', slug: 'docs/support' },
					],
				},
			],
		}),
		sitemap(),
	],
});
