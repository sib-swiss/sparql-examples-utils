import { themeOf } from './theme.js';

const LINE_HEIGHT = 1.25;
let svgCount = 0;

/**
 * Draws a diagram that ELK laid out, see layoutGraph, as SVG.
 *
 * @param {object} laidOut the result of layoutGraph
 * @param {object} [options]
 * @param {object} [options.theme] the same as for the layout, see theme.js
 * @param {string} [options.idPrefix] makes the ids in the SVG unique, when there are several on one page
 * @param {string} [options.title] the accessible name of the diagram
 * @returns {string} an <svg> element
 */
export function toSvg(laidOut, options = {}) {
	const theme = themeOf(options);
	const prefix = options.idPrefix ?? `sparql-mermaid-${++svgCount}-`;
	const width = Math.ceil(laidOut.width ?? 0);
	const height = Math.ceil(laidOut.height ?? 0);

	const groups = [];
	const nodes = [];
	const edges = [];
	(function collect(elk, depth) {
		for (const child of elk.children ?? []) {
			if (child.sparql?.group) {
				groups.push({ elk: child, depth });
				collect(child, depth + 1);
			} else {
				nodes.push(child);
			}
		}
		edges.push(...(elk.edges ?? []));
	})(laidOut, 0);

	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`
			+ ` role="img" font-family="${escape(theme.fontFamily)}" font-size="${theme.fontSize}">`,
		options.title ? `<title>${escape(options.title)}</title>` : '',
		defs(prefix, theme),
		...groups.sort((a, b) => a.depth - b.depth).map(({ elk }) => drawGroup(elk, theme)),
		...edges.map((edge) => drawEdge(edge, prefix, theme)),
		...nodes.map((node) => drawNode(node, theme)),
		...edges.flatMap((edge) => (edge.labels ?? []).map((label) => drawEdgeLabel(label, theme))),
		'</svg>',
	];
	return parts.filter(Boolean).join('\n');
}

function defs(prefix, theme) {
	const color = theme.colors.edge;
	return `<defs>
<marker id="${prefix}arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>
<marker id="${prefix}circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7"><circle cx="5" cy="5" r="4" fill="${color}"/></marker>
</defs>`;
}

// ---- groups

function groupStyle(kind, theme) {
	const c = theme.colors;
	switch (kind) {
		case 'optional':
			return { fill: c.optional, stroke: c.nodeStroke, dash: '5 5', width: 1 };
		case 'unionBranch':
			return { fill: c.unionBranch, stroke: c.nodeStroke, dash: '3 3', width: 1 };
		case 'minus':
			return { fill: c.minus, stroke: c.minusStroke, dash: null, width: 4 };
		case 'service':
			return { fill: c.group, stroke: c.groupStroke, dash: null, width: 3 };
		default: // union, exists
			return { fill: c.group, stroke: c.groupStroke, dash: null, width: 1 };
	}
}

function drawGroup(elk, theme) {
	const style = groupStyle(elk.sparql.group, theme);
	const dash = style.dash ? ` stroke-dasharray="${style.dash}"` : '';
	const rect = `<rect x="${n(elk.x)}" y="${n(elk.y)}" width="${n(elk.width)}" height="${n(elk.height)}" rx="4"`
		+ ` fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.width}"${dash}/>`;
	const label = elk.labels?.[0];
	const title = label
		? `<text x="${n(elk.x + elk.width / 2)}" y="${n(label.y + label.height / 2)}" text-anchor="middle" dominant-baseline="central"`
			+ ` fill="${theme.colors.text}">${escape(label.text)}</text>`
		: '';
	return `<g class="group ${elk.sparql.group}" data-id="${escape(elk.id)}">${rect}${title}</g>`;
}

// ---- nodes

function nodeFill(style, theme) {
	const c = theme.colors;
	return { projected: c.projected, literal: c.literal, iri: c.iri, value: c.value }[style] ?? c.node;
}

function drawNode(elk, theme) {
	const { shape, style, lines } = elk.sparql;
	const { x, y, width: w, height: h } = elk;
	const paint = `fill="${nodeFill(style, theme)}" stroke="${theme.colors.nodeStroke}" stroke-width="1"`;
	let outline;
	switch (shape) {
		case 'circle':
			outline = `<circle cx="${n(x + w / 2)}" cy="${n(y + h / 2)}" r="${n(w / 2)}" ${paint}/>`;
			break;
		case 'stadium':
			outline = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(h / 2)}" ${paint}/>`;
			break;
		case 'subroutine': // a filter: a box with a double line at each side
			outline = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${paint}/>`
				+ `<path d="M${n(x + 6)},${n(y)} V${n(y + h)} M${n(x + w - 6)},${n(y)} V${n(y + h)}" stroke="${theme.colors.nodeStroke}" fill="none"/>`;
			break;
		case 'parallelogram': {
			const skew = Math.min(10, h / 3);
			outline = `<path d="M${n(x + skew)},${n(y)} H${n(x + w)} L${n(x + w - skew)},${n(y + h)} H${n(x)} Z" ${paint}/>`;
			break;
		}
		default: // rounded, a variable
			outline = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="5" ${paint}/>`;
	}
	return `<g class="node ${shape}${style ? ' ' + style : ''}" data-id="${escape(elk.id)}">${outline}${text(lines, x + w / 2, y + h / 2, theme.fontSize, theme)}</g>`;
}

/** Lines of text, centred around (cx, cy). */
function text(lines, cx, cy, fontSize, theme) {
	if (!lines?.length || (lines.length === 1 && !lines[0])) {
		return '';
	}
	const lineHeight = fontSize * LINE_HEIGHT;
	const top = cy - ((lines.length - 1) * lineHeight) / 2;
	const spans = lines.map((line, i) => `<tspan x="${n(cx)}" y="${n(top + i * lineHeight)}">${escape(line)}</tspan>`).join('');
	return `<text text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" fill="${theme.colors.text}">${spans}</text>`;
}

// ---- edges

function drawEdge(edge, prefix, theme) {
	const { kind, dotted } = edge.sparql;
	const points = (edge.sections ?? []).flatMap((section) => [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]);
	if (points.length < 2) {
		return '';
	}
	const d = 'M' + points.map((p) => `${n(p.x)},${n(p.y)}`).join(' L');
	const end = kind === 'input' || kind === 'member' || kind === 'as' ? 'circle' : kind === 'chain' ? null : 'arrow';
	const markers = (end ? ` marker-end="url(#${prefix}${end})"` : '')
		+ (kind === 'or' ? ` marker-start="url(#${prefix}arrow)"` : '');
	const width = kind === 'or' ? 3 : 1.3;
	const dash = dotted ? ' stroke-dasharray="3 3"' : '';
	return `<path class="edge ${kind}" d="${d}" fill="none" stroke="${theme.colors.edge}" stroke-width="${width}"${dash}${markers}/>`;
}

function drawEdgeLabel(label, theme) {
	const background = `<rect x="${n(label.x)}" y="${n(label.y)}" width="${n(label.width)}" height="${n(label.height)}" rx="2" fill="${theme.colors.edgeLabel}"/>`;
	return `<g class="edge-label">${background}${text([label.text], label.x + label.width / 2, label.y + label.height / 2, theme.edgeFontSize, theme)}</g>`;
}

// ---- helpers

function n(value) {
	return Math.round(value * 10) / 10;
}

function escape(value) {
	return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
