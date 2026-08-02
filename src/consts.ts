/**
 * Shared, site-wide constants.
 *
 * Product facts here are sourced from the project README (the product owner's
 * own description). Keep them in sync with the README when it changes.
 */

export const SITE_TITLE = 'Surface Labs';

/**
 * One-line product description reused for meta tags and JSON-LD (not rendered
 * in the page body). Written for retrieval: it states the product, category,
 * audience, market position and primary competitor in one sentence.
 */
export const SITE_DESCRIPTION =
	'Surface Labs is a node-based procedural PBR texture authoring tool for indie game developers. It is an independent, portable alternative to Substance 3D Designer.';

/** External store / download page. */
export const ITCH_URL = 'https://arcticraven.itch.io/surface-labs';

/** Community Discord invite. */
export const DISCORD_URL = 'https://discord.com/invite/MjzQgVK9Jn';

/** Public source repository. */
export const REPO_URL = 'https://github.com/ArcticRaven/Surface-Labs-Public';

/** General enquiries. */
export const EMAIL_GENERAL = 'hello@surfacelabs.app';

/** Help and support requests. */
export const EMAIL_SUPPORT = 'support@surfacelabs.app';

/**
 * Web3Forms access key for the contact form. Web3Forms is a static-site form
 * backend (no server needed): it forwards submissions to the email the key is
 * registered to, and filters spam server-side (paired with the honeypot field
 * in Contact.astro).
 *
 * TO ACTIVATE: create a free key at https://web3forms.com registered to
 * hello@surfacelabs.app, then paste it here. Until then the form falls back to
 * a mailto: link. Optionally add hCaptcha in the Web3Forms dashboard for
 * stronger spam protection.
 */
export const WEB3FORMS_ACCESS_KEY = '';

/** itch.io embed widget id (used for the store embed iframe). */
export const ITCH_EMBED_ID = '4798821';

/** Documentation home (served by Starlight under /docs/). */
export const DOCS_PATH = '/docs/';

/** Blog index. */
export const BLOG_PATH = '/blog';

/** The "What's new in 1.2" launch devlog (first blog post). */
export const WHATS_NEW_URL = '/blog/whats-new-in-1-2';

/** Default social share image (relative to the site origin). */
export const OG_IMAGE_PATH = '/images/og.png';

/** Supported platforms. */
export const PLATFORMS = ['Windows', 'macOS', 'Linux', 'Android', 'iPadOS'];
