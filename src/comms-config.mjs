// Feed-level facts for the in-app comms feed (see scripts/build-comms.mjs and
// the app repo's comms contract). Everything here lands in /app/comms.json.

/** Canonical production origin. Kept in sync with astro.config.mjs. */
export const SITE = 'https://surfacelabs.app';

/**
 * Where the feed lives *next*. The app persists this and uses it on later
 * launches, so the endpoint can be relocated without an app release. Body and
 * image paths resolve relative to it. Leave it pointing at the current URL
 * until there is a reason to move.
 */
export const FEED_URL = `${SITE}/app/comms.json`;

/**
 * The current release. A *state*, not an event: the app shows a
 * "<version> available" pill for as long as this version is newer than the
 * build the reader is running, whereas the announcement of it is one dated
 * post that scrolls away.
 *
 * `version` must be the version actually on the store page. The app only
 * shows the notice when it is strictly greater than the running build, so
 * publishing a version that is not downloadable yet sends people to a store
 * page that cannot give it to them.
 *
 * `priority: 'pinned'` adds a one-time toast on top of the pill, fired at most
 * once per version ever. Use it for releases worth interrupting someone over;
 * `'normal'` for the rest.
 */
export const LATEST = {
	version: '1.2.2',
	headline: 'A rebuilt 3D preview, subsurface scattering and bloom, and a manual that updates itself.',
	url: 'https://arcticraven.itch.io/surface-labs',
	priority: 'normal',
};
