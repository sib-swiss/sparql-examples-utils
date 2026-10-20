import { constantKey, termText } from './labels.js';

/**
 * The nodes of one diagram, or of one EXISTS clause, which is drawn as a
 * diagram of its own inside a subgraph. Gives them short mermaid ids:
 * `v1` for variables, `a1` for blank nodes and `c1` for constants.
 */
export class Scope {
	/**
	 * @param {import('./iris.js').Iris} iris
	 * @param {string} prefix for the ids, so that they are unique when scopes are nested
	 */
	constructor(iris, prefix = '') {
		this.iris = iris;
		this.prefix = prefix;
		/** @type {Map<string,string>} variable name to id */
		this.variables = new Map();
		/** @type {Map<string,string>} blank node label to id */
		this.anonymous = new Map();
		/** @type {Map<string,{id: string, term: object}>} constant key to id */
		this.constants = new Map();
		/** @type {Set<string>} constants that are a subject or object, and so a node in the diagram */
		this.usedAsNode = new Set();
		this.pathNodes = 0;
	}

	variable(name) {
		return this.#id(this.variables, name, 'v');
	}

	anonymousNode(label) {
		return this.#id(this.anonymous, label, 'a');
	}

	/** An unnamed node between the two steps of a property path. */
	freshAnonymousNode() {
		return this.anonymousNode(`path ${++this.pathNodes}`);
	}

	constant(term) {
		const key = constantKey(term, this.iris);
		let entry = this.constants.get(key);
		if (!entry) {
			entry = { id: `${this.prefix}c${this.constants.size + 1}`, term };
			this.constants.set(key, entry);
		}
		return entry.id;
	}

	/** @returns {string} the mermaid id of a term */
	node(term) {
		switch (term.subType) {
			case 'variable':
				return this.variable(term.value);
			case 'blankNode':
				return this.anonymousNode(term.label);
			default:
				return this.constant(term);
		}
	}

	markUsedAsNode(term) {
		const key = constantKey(term, this.iris);
		if (key !== null) {
			this.usedAsNode.add(key);
		}
	}

	isUsedAsNode(term) {
		return this.usedAsNode.has(constantKey(term, this.iris));
	}

	/**
	 * The variables, blank nodes and constants, in the order in which they are drawn.
	 * @param {{names: Set<string>, constants: Set<string>}} projection
	 * @returns {import('./graph.js').Declaration[]}
	 */
	declarations(projection) {
		const declarations = [];
		const byName = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
		for (const [name, id] of [...this.variables].sort(byName)) {
			declarations.push({ id, kind: 'variable', label: '?' + name, style: projection.names.has(name) ? 'projected' : null });
		}
		for (const [, id] of [...this.anonymous].sort(byName)) {
			declarations.push({ id, kind: 'anonymous', label: '', style: null });
		}
		for (const [key, { id, term }] of this.constants) {
			if (this.usedAsNode.has(key)) {
				const style = projection.constants.has(key) ? 'projected' : term.subType === 'literal' ? 'literal' : 'iri';
				declarations.push({ id, kind: 'constant', label: termText(term, this.iris), style });
			}
		}
		return declarations;
	}

	#id(map, key, letter) {
		let id = map.get(key);
		if (id === undefined) {
			id = `${this.prefix}${letter}${map.size + 1}`;
			map.set(key, id);
		}
		return id;
	}
}
