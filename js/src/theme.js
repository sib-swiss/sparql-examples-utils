/**
 * How the ELK backend draws a diagram. Pass a partial theme in the options to change it, for example
 * `{ theme: { colors: { projected: '#b6e3b6' } } }`. The colors follow those of the mermaid diagrams.
 */
export const DEFAULT_THEME = Object.freeze({
	fontFamily: 'Helvetica, Arial, sans-serif',
	fontSize: 13,
	edgeFontSize: 11,
	/** characters per line of the text of a FILTER, BIND or VALUES, which is wrapped at spaces */
	wrapAt: 48,
	colors: Object.freeze({
		text: '#222',
		node: '#ececff',
		nodeStroke: '#9370db',
		projected: 'lightgreen',
		literal: 'orange',
		iri: 'yellow',
		value: '#f4f4fb',
		edge: '#555',
		edgeLabel: 'rgba(232, 232, 232, 0.85)',
		group: '#ffffde',
		groupStroke: '#aaaa33',
		optional: '#bbbbff',
		unionBranch: '#aabbff',
		minus: 'pink',
		minusStroke: 'red',
	}),
});

/** The theme with the overrides of the options. */
export function themeOf(options = {}) {
	const theme = options.theme ?? {};
	return { ...DEFAULT_THEME, ...theme, colors: { ...DEFAULT_THEME.colors, ...theme.colors } };
}
