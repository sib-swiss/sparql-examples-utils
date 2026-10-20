import { quote } from './labels.js';

const CLASS_DEFINITIONS = [
	'classDef projected fill:lightgreen;',
	'classDef literal fill:orange;',
	'classDef iri fill:yellow;',
];

/** The style of a group, none for a union, whose branches have one, and for exists. */
const GROUP_STYLES = {
	optional: 'fill:#bbf,stroke-dasharray: 5 5;',
	unionBranch: 'fill:#abf,stroke-dasharray: 3 3;',
	minus: 'stroke-width:6px,fill:pink,stroke:red;',
	service: 'stroke-width:4px;',
};

const ARROWS = { uses: '-->', values: '-->', value: '-->', input: '--o', member: '--o', as: '--as--o' };

/**
 * The lines of a mermaid flowchart for a diagram, without its first line `graph TD`.
 * @param {import('./graph.js').Graph} graph
 * @returns {string[]}
 */
export function toMermaidLines(graph) {
	const lines = [...CLASS_DEFINITIONS];
	const indent = '  ';
	declarations(graph.declarations, indent, lines);
	items(graph.items, indent, lines);
	return lines;
}

function declarations(nodes, indent, lines) {
	for (const node of nodes) {
		const style = node.style ? `:::${node.style}` : '';
		switch (node.kind) {
			case 'variable':
				lines.push(`${indent}${node.id}(${quote(node.label)})${style}`);
				break;
			case 'anonymous':
				lines.push(`${indent}${node.id}((" "))`);
				break;
			default:
				lines.push(`${indent}${node.id}([${quote(node.label)}])${style}`);
		}
	}
}

function items(list, indent, lines) {
	for (const item of list) {
		switch (item.type) {
			case 'group': {
				const inner = indent + '  ';
				lines.push(`${indent}subgraph ${item.id}[${quote(item.title)}]`);
				if (GROUP_STYLES[item.kind]) {
					lines.push(`${inner}style ${item.id} ${GROUP_STYLES[item.kind]}`);
				}
				declarations(item.declarations ?? [], inner, lines);
				items(item.items, inner, lines);
				lines.push(`${indent}end`);
				break;
			}
			case 'node':
				lines.push(indent + node(item));
				break;
			case 'chain': {
				const arrow = item.dotted ? '-.->' : '-->';
				lines.push(`${indent}${item.from} ${arrow} ${item.middle} ${arrow} ${item.to}`);
				break;
			}
			case 'edge':
				lines.push(indent + edge(item));
				break;
		}
	}
}

function node({ kind, id, label }) {
	switch (kind) {
		case 'filter':
			return `${id}[[${quote(label)}]]`;
		case 'bind':
		case 'values':
			return `${id}[/${quote(label)}/]`;
		default:
			return `${id}([${quote(label)}])`;
	}
}

function edge({ kind, from, to, label, dotted }) {
	switch (kind) {
		case 'triple':
			return dotted ? `${from} -.${quote(label)}.-> ${to}` : `${from} --${quote(label)}--> ${to}`;
		case 'exists':
			return `${from} --${quote(label)}--> ${to}`;
		case 'or':
			return `${from} <== or ==> ${to}`;
		default:
			return `${from} ${ARROWS[kind]} ${to}`;
	}
}
