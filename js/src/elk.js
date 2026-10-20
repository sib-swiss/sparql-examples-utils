import { walk } from './graph.js';
import { estimateTextWidth, wrap } from './measure.js';
import { themeOf } from './theme.js';

const LINE_HEIGHT = 1.25; // of the font size

/** Default options of the ELK layered layout, override them with the layoutOptions option. */
export const DEFAULT_LAYOUT_OPTIONS = Object.freeze({
	'elk.algorithm': 'layered',
	'elk.direction': 'DOWN',
	'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
	'elk.json.shapeCoords': 'ROOT', // all positions are absolute, which makes drawing simple
	'elk.json.edgeCoords': 'ROOT',
	'elk.edgeRouting': 'ORTHOGONAL',
	'elk.layered.spacing.nodeNodeBetweenLayers': '36',
	'elk.spacing.nodeNode': '24',
	'elk.spacing.edgeNode': '14',
	'elk.spacing.edgeEdge': '10',
	'elk.spacing.edgeLabel': '3',
	'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
	'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
});

/**
 * Turns a diagram into the input of an ELK layout, see https://eclipse.dev/elk/documentation/tooldevelopers/graphdatastructure/jsonformat.html
 *
 * A variable, blank node or constant is put in the innermost group (OPTIONAL, UNION, ...) that has all its
 * edges, so a variable that is used outside an OPTIONAL is drawn outside it, and one that is only used in it,
 * in it. Filter, bind and values nodes are put in the group they are in.
 *
 * Each ELK node and edge has a `sparql` member with what is needed to draw it, which ELK keeps.
 *
 * @param {import('./graph.js').Graph} graph
 * @param {object} [options]
 * @param {(text: string, fontSize: number) => number} [options.measure] the width of a line of text,
 *        defaults to an estimate for Helvetica and Arial
 * @param {object} [options.theme] see theme.js
 * @param {Record<string,string>} [options.layoutOptions] ELK layout options, added to DEFAULT_LAYOUT_OPTIONS
 * @param {number} [options.maxValues] how many values of a VALUES, or members of an IN (...), are drawn.
 *        The others are one node "… and n more". Default 6, Infinity draws all.
 * @returns {object} the ELK graph
 */
export function toElkGraph(graph, options = {}) {
	graph = flattenUnions(limitValues(graph, options.maxValues ?? 6));
	const theme = themeOf(options);
	const measure = options.measure ?? estimateTextWidth;
	const root = { id: 'root', layoutOptions: { ...DEFAULT_LAYOUT_OPTIONS, ...options.layoutOptions }, children: [], edges: [] };

	/** id of every group and node to where it is: { parent: group id or 'root', elk: the ELK node } */
	const containers = new Map([['root', { parent: null, elk: root, depth: 0 }]]);
	const parentOf = (id) => containers.get(id).parent;
	const depthOf = (id) => containers.get(id).depth;
	const lowestCommonAncestor = (a, b) => {
		while (depthOf(a) > depthOf(b)) a = parentOf(a);
		while (depthOf(b) > depthOf(a)) b = parentOf(b);
		while (a !== b) {
			a = parentOf(a);
			b = parentOf(b);
		}
		return a;
	};

	// the groups, as ELK nodes with children
	const scopes = [{ root: 'root', declarations: graph.declarations }];
	walk(graph.items, (item, path) => {
		if (item.type !== 'group') {
			return;
		}
		const parent = path.at(-1)?.id ?? 'root';
		const elk = groupNode(item, theme, measure);
		containers.set(item.id, { parent, elk, depth: depthOf(parent) + 1 });
		if (item.declarations) {
			scopes.push({ root: item.id, declarations: item.declarations });
		}
	});

	// where the edges of each node are
	const mentioned = new Map();
	const mention = (id, path) => {
		const group = path.at(-1)?.id ?? 'root';
		if (!mentioned.has(id)) {
			mentioned.set(id, []);
		}
		mentioned.get(id).push(group);
	};
	walk(graph.items, (item, path) => {
		if (item.type === 'edge') {
			mention(item.from, path);
			mention(item.to, path);
		} else if (item.type === 'chain') {
			[item.from, item.middle, item.to].forEach((id) => mention(id, path));
		}
	});

	const place = (id, elk, parent) => {
		containers.set(id, { parent, elk, depth: depthOf(parent) + 1 });
	};
	for (const scope of scopes) {
		for (const declaration of scope.declarations) {
			const groups = (mentioned.get(declaration.id) ?? []).filter((group) => isWithin(group, scope.root, parentOf));
			const parent = groups.length ? groups.reduce(lowestCommonAncestor) : scope.root;
			place(declaration.id, termNode(declaration, theme, measure), parent);
		}
	}
	walk(graph.items, (item, path) => {
		if (item.type === 'node') {
			place(item.id, itemNode(item, theme, measure), path.at(-1)?.id ?? 'root');
		}
	});

	// put every node in its parent, the groups first
	const ordered = [...containers.entries()].filter(([id]) => id !== 'root').sort((a, b) => a[1].depth - b[1].depth);
	for (const [, { parent, elk }] of ordered) {
		containers.get(parent).elk.children.push(elk);
	}

	// the edges, each in the lowest common ancestor of its ends, as ELK wants it
	let edgeCount = 0;
	const addEdge = (from, to, sparql, label) => {
		const elk = {
			id: `e${edgeCount++}`,
			sources: [from],
			targets: [to],
			// inline: the label of an edge on the edge itself, as in mermaid, an option of the label in ELK
			labels: label ? [{ ...textLabel(label, theme.edgeFontSize, measure), layoutOptions: { 'elk.edgeLabels.inline': 'true' } }] : [],
			sparql,
		};
		const container = lowestCommonAncestor(parentOf(from), parentOf(to));
		const holder = containers.get(container).elk;
		(holder.edges ??= []).push(elk);
	};
	walk(graph.items, (item) => {
		if (item.type === 'edge') {
			const label = item.kind === 'triple' || item.kind === 'exists' ? item.label
				: item.kind === 'as' ? 'as' : item.kind === 'or' ? 'or' : undefined;
			addEdge(item.from, item.to, { kind: item.kind, dotted: !!item.dotted }, label);
		} else if (item.type === 'chain') {
			addEdge(item.from, item.middle, { kind: 'chain', dotted: item.dotted });
			addEdge(item.middle, item.to, { kind: 'triple', dotted: item.dotted });
		}
	});
	return root;
}

/**
 * Lays out a diagram with ELK.
 * @param {import('./graph.js').Graph} graph
 * @param {object} [options] those of toElkGraph, and `elk`: an ELK instance to use, for example one that
 *        runs in a web worker. Defaults to the bundled ELK, which runs on this thread.
 * @returns {Promise<object>} the ELK graph with positions
 */
export async function layoutGraph(graph, options = {}) {
	const elk = options.elk ?? (await defaultElk());
	return elk.layout(toElkGraph(graph, options));
}

/**
 * A copy of the graph where A UNION B UNION C, which is a union of a union, is one union with three branches,
 * and without the "or" edges between branches. The union box says that already, and the edges make ELK stack
 * the branches and route the edges around them.
 */
export function flattenUnions(graph) {
	const branchesOf = (union) => union.items.flatMap((item) => {
		if (item.type !== 'group' || item.kind !== 'unionBranch') {
			return []; // the or edge
		}
		const only = item.items.length === 1 ? item.items[0] : null;
		return only?.type === 'group' && only.kind === 'union' ? branchesOf(only) : [item];
	});
	const flatten = (items) => items.map((item) => {
		if (item.type !== 'group') {
			return item;
		}
		const children = item.kind === 'union' ? branchesOf(item) : item.items;
		return { ...item, items: flatten(children) };
	});
	return { ...graph, items: flatten(graph.items) };
}

/**
 * A copy of the graph with at most max values for each VALUES and members for each IN (...), the rest
 * replaced by one node. A query can list hundreds, which makes the diagram unreadable and slow to lay out.
 */
export function limitValues(graph, max) {
	const limit = (items) => {
		const counts = new Map(); // VALUES or filter node id to how many of its values are kept
		const dropped = new Map(); // the same, to how many are left out
		const kept = [];
		const droppedIds = new Set();
		for (const item of items) {
			const isValue = item.type === 'node' && (item.kind === 'value' || item.kind === 'member');
			if (isValue) {
				const owner = items.find((other) => other.type === 'edge' && other.from === item.id)?.to;
				const count = counts.get(owner) ?? 0;
				if (count >= max) {
					droppedIds.add(item.id);
					dropped.set(owner, (dropped.get(owner) ?? 0) + 1);
					continue;
				}
				counts.set(owner, count + 1);
			}
			if (item.type === 'edge' && droppedIds.has(item.from)) {
				continue;
			}
			kept.push(item.type === 'group' ? { ...item, items: limit(item.items) } : item);
		}
		for (const [owner, n] of dropped) {
			const id = `${owner}more`;
			const kind = kept.find((item) => item.type === 'edge' && item.to === owner && (item.kind === 'value' || item.kind === 'member'))?.kind ?? 'value';
			kept.push({ type: 'node', kind, id, label: `… and ${n} more` });
			kept.push({ type: 'edge', kind, from: id, to: owner });
		}
		return kept;
	};
	return Number.isFinite(max) ? { ...graph, items: limit(graph.items) } : graph;
}

let bundled;
async function defaultElk() {
	if (!bundled) {
		const { default: ELK } = await import('elkjs/lib/elk.bundled.js');
		bundled = new ELK();
	}
	return bundled;
}

function isWithin(group, ancestor, parentOf) {
	for (let current = group; current !== null; current = parentOf(current)) {
		if (current === ancestor) {
			return true;
		}
	}
	return false;
}

function textLabel(text, fontSize, measure) {
	return { text, width: Math.ceil(measure(text, fontSize)) + 6, height: Math.ceil(fontSize * LINE_HEIGHT) + 2 };
}

/** A node with lines of text in it, of the size that the shape needs around the text. */
function sizedNode(id, lines, theme, measure, padding, sparql) {
	const width = Math.max(...lines.map((line) => measure(line, theme.fontSize)));
	const height = lines.length * theme.fontSize * LINE_HEIGHT;
	return {
		id,
		width: Math.ceil(width + 2 * padding.x),
		height: Math.ceil(height + 2 * padding.y),
		sparql: { ...sparql, lines },
	};
}

function termNode(declaration, theme, measure) {
	if (declaration.kind === 'anonymous') {
		return { id: declaration.id, width: 16, height: 16, sparql: { shape: 'circle', style: declaration.style, lines: [] } };
	}
	const shape = declaration.kind === 'variable' ? 'rounded' : 'stadium';
	const padding = shape === 'stadium' ? { x: 16, y: 7 } : { x: 10, y: 7 };
	return sizedNode(declaration.id, [declaration.label], theme, measure, padding, { shape, style: declaration.style });
}

const ITEM_SHAPES = {
	filter: { shape: 'subroutine', padding: { x: 16, y: 7 }, wrap: true },
	bind: { shape: 'parallelogram', padding: { x: 18, y: 7 }, wrap: true },
	values: { shape: 'parallelogram', padding: { x: 18, y: 7 }, wrap: true },
	value: { shape: 'stadium', padding: { x: 14, y: 5 }, wrap: false },
	member: { shape: 'stadium', padding: { x: 14, y: 5 }, wrap: false },
};

function itemNode(item, theme, measure) {
	const { shape, padding, wrap: wraps } = ITEM_SHAPES[item.kind];
	const lines = wraps ? wrap(item.label, theme.wrapAt) : [item.label];
	return sizedNode(item.id, lines, theme, measure, padding, { shape, style: item.kind === 'value' || item.kind === 'member' ? 'value' : null, kind: item.kind });
}

function groupNode(group, theme, measure) {
	const title = group.title.trim();
	const titleHeight = title ? Math.ceil(theme.fontSize * LINE_HEIGHT) + 8 : 4;
	return {
		id: group.id,
		layoutOptions: {
			'elk.padding': `[top=${titleHeight + 10},left=12,bottom=12,right=12]`,
			'elk.nodeLabels.placement': 'H_CENTER V_TOP INSIDE',
		},
		labels: title ? [textLabel(title, theme.fontSize, measure)] : [],
		children: [],
		edges: [],
		sparql: { group: group.kind, title },
	};
}
