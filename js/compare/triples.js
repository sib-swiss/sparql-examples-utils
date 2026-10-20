/**
 * Which triple patterns a diagram draws, from the lines of the diagram.
 *
 * The Java and JavaScript versions give different ids to the nodes and draw in a different order, so the
 * diagrams are compared by the label of the nodes at both ends of an edge, and the label of the edge.
 */

const unescape = (text) => text
	.replace(/#quot;/g, '"').replace(/#lt;/g, '<').replace(/#gt;/g, '>')
	.replace(/#91;/g, '[').replace(/#93;/g, ']').replace(/#96;/g, '`');

const unquote = (text) => (text.length >= 2 && text.startsWith('"') && text.endsWith('"') ? text.slice(1, -1) : text);

/** Ids of the nodes that are not a node of the query: filter, bind and values nodes. */
const STRUCTURAL = /^(bind|f|values)\d+$/;
/** The same, for the ids of nodes that were never declared as a variable, blank node or constant. */
const UNDECLARED_STRUCTURAL = /^<(f|bind|values|union|optional|minus|s|e)/;

/**
 * @param {string} raw the label as in the diagram
 */
export function normalizeLabel(raw) {
	let label = unescape(unquote(raw.trim()));
	// the language of a literal is the same, but written in capitals by one and not by the other
	label = label.replace(/@[A-Za-z0-9-]+$/, '@');
	if (label === '""') {
		label = ''; // an empty string is drawn as "", mermaid does not allow an empty label
	}
	return label;
}

/**
 * @param {string[]} lines the lines of a diagram, without its first line
 * @returns {Set<string>} `subject | predicate | object` for every triple pattern in the diagram
 */
export function tripleEdges(lines) {
	const labels = new Map(); // id to label of the nodes
	const edges = [];
	for (const raw of lines) {
		const line = raw.trim();
		let match;
		if ((match = /^(\S+?)\(\("[^"]*"\)\)/.exec(line))) {
			labels.set(match[1], '_'); // anonymous node
		} else if ((match = /^(\S+?)\("(.*)"\)(:::\w+)?\s*$/.exec(line))) {
			labels.set(match[1], normalizeLabel(match[2])); // variable
		} else if ((match = /^(\S+?)\(\[(.*)\]\)(:::\w+)?\s*$/.exec(line))) {
			labels.set(match[1], normalizeLabel(match[2])); // constant
		} else {
			edges.push(line);
		}
	}
	const name = (id) => labels.get(id) ?? `<${id.replace(/\d+/g, '#')}>`;
	const triples = new Set();
	const add = (subject, predicate, object) => {
		const ends = [subject, predicate, object];
		if (!ends.some((end) => UNDECLARED_STRUCTURAL.test(end)) && !/_anon_having/.test(subject + object)) {
			triples.add(`${subject} | ${predicate} | ${object}`);
		}
	};
	for (const line of edges) {
		let match;
		// a predicate that is a node as well is between subject and object: s --> p --> o
		if ((match = /^(\S+) --> (\S+) --> (\S+)$/.exec(line)) || (match = /^(\S+) -\.-> (\S+) -\.-> (\S+)$/.exec(line))) {
			add(name(match[1]), `@${name(match[2])}`, name(match[3]));
		} else if ((match = /^(\S+) (?:--|-\.)(.+?)(?:-->|\.->)\s+(\S+)$/.exec(line))) {
			const [, from, label, to] = match;
			if (!STRUCTURAL.test(from) && !/^"?(NOT )?EXISTS"?$/.test(label)) {
				add(name(from), normalizeLabel(label), name(to));
			}
		}
	}
	return triples;
}

/**
 * The Java version gives the same id to different variables when a query has a BIND or (expression AS ?x),
 * which merges them in the diagram. Its triples can not be compared.
 */
export function hasCollidingIds(javaLines) {
	const seen = new Set();
	for (const line of javaLines) {
		const match = /^\s*(\S+?)\(+"/.exec(line);
		if (match && match[1].length < 8) {
			if (seen.has(match[1])) {
				return true;
			}
			seen.add(match[1]);
		}
	}
	return false;
}

/**
 * @returns {{onlyJava: string[], onlyJs: string[]}} the triple patterns that are drawn by one version only
 */
export function compareTriples(javaLines, jsLines) {
	const java = tripleEdges(javaLines);
	const js = tripleEdges(jsLines);
	return {
		onlyJava: [...java].filter((triple) => !js.has(triple)),
		onlyJs: [...js].filter((triple) => !java.has(triple)),
	};
}
