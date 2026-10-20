/**
 * Draws a SPARQL query as SVG, laid out with ELK, without mermaid. A separate entry point, so that using
 * only the mermaid text does not need ELK.
 */
import { layoutGraph, toElkGraph } from './elk.js';
import { sparqlToGraph } from './index.js';
import { toSvg } from './svg.js';

export { DEFAULT_LAYOUT_OPTIONS, layoutGraph, toElkGraph } from './elk.js';
export { estimateTextWidth, measureWithCanvas } from './measure.js';
export { toSvg } from './svg.js';
export { DEFAULT_THEME } from './theme.js';

/**
 * Draws a SPARQL query as an SVG.
 *
 * @param {string} query
 * @param {object} [options] those of sparqlToMermaid (prefixes, base), of the layout (measure, theme,
 *        layoutOptions, elk) and of toSvg (idPrefix, title)
 * @returns {Promise<string>} an <svg> element
 * @throws when the query is not valid SPARQL 1.1
 */
export async function sparqlToSvg(query, options = {}) {
	return toSvg(await layoutGraph(sparqlToGraph(query, options), options), options);
}

/**
 * The input of an ELK layout for a SPARQL query, to lay it out and draw it yourself.
 * @returns {object}
 */
export function sparqlToElk(query, options = {}) {
	return toElkGraph(sparqlToGraph(query, options), options);
}
