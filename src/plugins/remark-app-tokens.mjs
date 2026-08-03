// The desktop/mobile app's documentation reader expands platform tokens
// ({{mod}} -> Ctrl or Cmd, {{rightclick}} -> right-click or long-press) and
// platform blocks (:::desktop / :::touch) at render time. The website cannot
// know the reader's platform, so this plugin renders each token as neutral
// wording and each platform block as a labelled paragraph. The in-app export
// (scripts/build-app-docs.mjs) passes both through verbatim instead.
//
// Tokens are only replaced in plain text nodes: inline code and code fences
// keep the literal {{...}} so pages can document the tokens themselves.

const TOKENS = {
	mod: 'Ctrl (Cmd on Mac)',
	alt: 'Alt (Option on Mac)',
	click: 'click',
	doubleclick: 'double-click',
	rightclick: 'right-click',
	drag: 'drag',
	platform: 'your platform',
};

const TOKEN_RE = /\{\{(mod|alt|click|doubleclick|rightclick|drag|platform)\}\}/g;

// Platform block names the app understands, mapped to a web-facing label.
const PLATFORM_BLOCKS = {
	desktop: 'On desktop',
	touch: 'On touch devices',
	'app-desktop': 'On desktop',
	'app-touch': 'On touch devices',
};

function walk(node, fn) {
	if (!node || typeof node !== 'object') return;
	fn(node);
	if (Array.isArray(node.children)) {
		for (const child of node.children) walk(child, fn);
	}
}

export default function remarkAppTokens() {
	return (tree) => {
		walk(tree, (node) => {
			if (node.type === 'text' && typeof node.value === 'string') {
				node.value = node.value.replace(TOKEN_RE, (_, name) => TOKENS[name]);
				return;
			}
			// A :::desktop block on the web becomes its own content with a bold
			// "On desktop" lead-in, so nothing authored for the app can vanish.
			if (node.type === 'containerDirective' && PLATFORM_BLOCKS[node.name]) {
				const label = PLATFORM_BLOCKS[node.name];
				node.type = 'blockquote';
				node.children = [
					{
						type: 'paragraph',
						children: [{ type: 'strong', children: [{ type: 'text', value: label }] }],
					},
					...(node.children ?? []),
				];
			}
		});
	};
}
