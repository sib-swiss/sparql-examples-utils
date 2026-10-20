import { ExpressionPrinter } from './expression.js';
import { termText } from './labels.js';
import { Scope } from './scope.js';

/** Path operators that apply to one path, and are drawn as part of the label of an edge. */
const PATH_MODIFIERS = new Set(['*', '+', '?', '!']);

/**
 * Turns the graph patterns of a SPARQL query into a diagram, as a tree of nodes, edges and groups
 * that the backends (mermaid, ELK) draw. See graph.js for what the tree is made of.
 *
 * The syntax tree is walked directly, where the Java version walks the algebra of rdf4j,
 * which has already rewritten OPTIONAL, UNION, property paths and so on.
 */
export class Renderer {
	/**
	 * @param {import('./iris.js').Iris} iris
	 * @param {{names: Set<string>, constants: Set<string>}} projection
	 * @param {object} [shared] used for nested renderers of EXISTS clauses
	 */
	constructor(iris, projection, shared = {}) {
		this.iris = iris;
		this.projection = projection;
		this.scope = new Scope(iris, shared.prefix ?? '');
		this.counters = shared.counters ?? {};
		/** edges are dotted inside OPTIONAL */
		this.optional = false;
		/** @type {import('./graph.js').Item[]} what is drawn, in order */
		this.items = [];
		this.open = [this.items];
	}

	/** Draws a whole query: its graph patterns, HAVING, and the expressions of its SELECT. */
	renderQuery(query) {
		this.markNodes(query.where ? [query.where] : []);
		for (const variable of query.variables ?? []) {
			if (variable.type === 'wildcard') {
				inScopeVariables(query.where ? [query.where] : []).forEach((name) => this.scope.variable(name));
			} else if (variable.subType === 'variable') {
				this.scope.variable(variable.value); // drawn, even if the query does not use it
			} else if (variable.subType === 'namedNode') {
				this.scope.markUsedAsNode(variable); // DESCRIBE <resource>
				this.scope.constant(variable);
			}
		}
		this.renderSelectBody(query);
	}

	/** @returns {import('./graph.js').Graph} the diagram, after renderQuery */
	graph() {
		return { declarations: this.declarations(), items: this.items };
	}

	/** The variables, blank nodes and constants of this scope. */
	declarations() {
		return this.scope.declarations(this.projection);
	}

	// ---- patterns

	renderSelectBody(query) {
		if (query.where) {
			this.renderPattern(query.where);
		}
		for (const having of query.solutionModifiers?.having?.having ?? []) {
			this.renderFilter(having);
		}
		for (const variable of query.variables ?? []) {
			if (variable.subType === 'bind') {
				this.renderBind(variable.expression, variable.variable);
			}
		}
	}

	renderPattern(pattern) {
		switch (pattern.subType) {
			case 'group':
			case 'graph': // the graph is not drawn
				this.renderPatterns(pattern.patterns);
				break;
			case 'bgp':
				for (const triple of pattern.triples.flatMap(expandTriple)) {
					this.renderTriple(triple);
				}
				break;
			case 'optional':
				this.renderOptional(pattern);
				break;
			case 'union':
				this.renderUnion(pattern.patterns.map((branch) => () => this.renderPattern(branch)));
				break;
			case 'minus':
				this.renderSubgraph('minus', 'minus', 'MINUS', pattern.patterns);
				break;
			case 'service':
				this.renderService(pattern);
				break;
			case 'filter':
				this.renderFilter(pattern.expression);
				break;
			case 'bind':
				this.renderBind(pattern.expression, pattern.variable);
				break;
			case 'values':
				this.renderValues(pattern);
				break;
			default:
				if (pattern.type === 'query') {
					this.renderSelectBody(pattern); // sub select, its nodes are those of the outer query
				}
		}
	}

	renderPatterns(patterns) {
		for (const pattern of patterns) {
			this.renderPattern(pattern);
		}
	}

	renderOptional(pattern) {
		const wasOptional = this.optional;
		this.optional = true;
		this.renderSubgraph('optional', 'optional', '(optional)', pattern.patterns);
		this.optional = wasOptional;
	}

	renderService(pattern) {
		const name = pattern.name.subType === 'variable' ? '?' + pattern.name.value : termText(pattern.name, this.iris);
		this.renderSubgraph('s', 'service', name, pattern.patterns);
	}

	renderSubgraph(idPrefix, kind, title, patterns) {
		this.group({ id: this.newId(idPrefix), kind, title }, () => this.renderPatterns(patterns));
	}

	/**
	 * Alternatives are drawn as two dashed subgraphs joined by "or". More than two
	 * are nested, so that A UNION B UNION C is drawn as (A or B) or C.
	 * @param {Array<() => void>} branches each draws one alternative
	 */
	renderUnion(branches) {
		const [first, ...rest] = branches;
		let left = first;
		for (const right of rest) {
			const previous = left;
			left = () => this.renderUnionOf(previous, right);
		}
		left();
	}

	renderUnionOf(left, right) {
		const id = this.newId('union');
		this.group({ id, kind: 'union', title: ' Union ' }, () => {
			this.group({ id: id + 'l', kind: 'unionBranch', title: ' ' }, left);
			this.group({ id: id + 'r', kind: 'unionBranch', title: ' ' }, right);
			this.add({ type: 'edge', kind: 'or', from: id + 'l', to: id + 'r' });
		});
	}

	// ---- triples

	renderTriple({ subject, predicate, object }) {
		this.renderPredicate(predicate, this.scope.node(subject), this.scope.node(object));
	}

	renderPredicate(predicate, from, to) {
		if (predicate.type === 'path') {
			this.renderPath(predicate, from, to);
		} else if (predicate.subType === 'variable') {
			this.chain(from, this.scope.variable(predicate.value), to);
		} else if (this.scope.isUsedAsNode(predicate)) {
			this.chain(from, this.scope.constant(predicate), to);
		} else {
			this.edge(from, to, termText(predicate, this.iris));
		}
	}

	renderPath(path, from, to) {
		const { subType, items } = path;
		if (subType === '|') {
			this.renderUnion(items.map((item) => () => this.renderPredicate(item, from, to)));
		} else if (subType === '/') {
			let start = from;
			items.forEach((item, i) => {
				const end = i === items.length - 1 ? to : this.scope.freshAnonymousNode();
				this.renderPredicate(item, start, end);
				start = end;
			});
		} else if (subType === '^') {
			this.renderPredicate(items[0], to, from);
		} else if (PATH_MODIFIERS.has(subType)) {
			this.edge(from, to, this.pathText(path));
		}
	}

	pathText(path) {
		if (path.type !== 'path') {
			return termText(path, this.iris);
		}
		const wrap = (item) => {
			const text = this.pathText(item);
			return item.type === 'path' && (item.subType === '/' || item.subType === '|') ? `(${text})` : text;
		};
		switch (path.subType) {
			case '/':
				// an alternative in a sequence needs brackets, a sequence in an alternative does not
				return path.items.map((item) => (item.type === 'path' && item.subType === '|' ? `(${this.pathText(item)})` : this.pathText(item))).join('/');
			case '|':
				return path.items.map((item) => this.pathText(item)).join('|');
			case '^':
			case '!':
				return path.subType + wrap(path.items[0]);
			default:
				return wrap(path.items[0]) + path.subType;
		}
	}

	/** A line from one node to another, with the label of the predicate. */
	edge(from, to, label) {
		this.add({ type: 'edge', kind: 'triple', from, to, label, dotted: this.optional });
	}

	/** A predicate that is a node as well, drawn between the subject and object. */
	chain(from, middle, to) {
		this.add({ type: 'chain', from, middle, to, dotted: this.optional });
	}

	// ---- filter, bind, values

	renderFilter(expression) {
		const printer = new ExpressionPrinter(this.iris);
		const text = printer.print(expression);
		const id = this.newId('f');
		this.add({ type: 'node', kind: 'filter', id, label: text });
		this.renderNested(id, printer, 'filter');
	}

	renderBind(expression, variable) {
		const printer = new ExpressionPrinter(this.iris);
		const text = printer.print(expression);
		const id = this.newId('bind');
		this.add({ type: 'node', kind: 'bind', id, label: text });
		this.renderNested(id, printer, 'bind');
		this.add({ type: 'edge', kind: 'as', from: id, to: this.scope.variable(variable.value) });
	}

	/** Connects a filter or bind node to the variables, IN lists and EXISTS clauses of its expression. */
	renderNested(id, printer, owner) {
		printer.exists.forEach((exists) => this.renderExists(id, exists));
		const variables = new Set(printer.variables);
		for (const exists of printer.exists) {
			variablesOf(exists.group, variables);
		}
		for (const name of variables) {
			const node = this.scope.variable(name);
			this.add(owner === 'bind'
				? { type: 'edge', kind: 'input', from: node, to: id }
				: { type: 'edge', kind: 'uses', from: id, to: node });
		}
		printer.listMembers.forEach((member, i) => {
			const node = `${id}m${i + 1}`;
			this.add({ type: 'node', kind: 'member', id: node, label: termText(member, this.iris) });
			this.add({ type: 'edge', kind: 'member', from: node, to: id });
		});
	}

	/** An EXISTS or NOT EXISTS clause is a subgraph with nodes of its own. */
	renderExists(parentId, { negated, group }) {
		const id = `${parentId}e${this.counters.exists = (this.counters.exists ?? 0) + 1}`;
		const nested = new Renderer(this.iris, this.projection, { prefix: id, counters: this.counters });
		nested.markNodes([group]);
		nested.renderPattern(group);
		this.add({
			type: 'group', kind: 'exists', id, title: negated ? 'Not Exists Clause' : 'Exists Clause',
			declarations: nested.declarations(), items: nested.items,
		});
		this.add({ type: 'edge', kind: 'exists', from: parentId, to: id, label: negated ? 'NOT EXISTS' : 'EXISTS' });
	}

	renderValues({ variables, values }) {
		const id = this.newId('values');
		const names = variables.map((variable) => variable.value);
		this.add({ type: 'node', kind: 'values', id, label: 'VALUES ' + names.map((name) => '?' + name).join(' ') });
		for (const name of names) {
			this.add({ type: 'edge', kind: 'values', from: id, to: this.scope.variable(name) });
		}
		values.forEach((row, r) => {
			names.forEach((name, c) => {
				if (row[name]) { // UNDEF has no value
					const node = `${id}r${r + 1}c${c + 1}`;
					this.add({ type: 'node', kind: 'value', id: node, label: termText(row[name], this.iris) });
					this.add({ type: 'edge', kind: 'value', from: node, to: id });
				}
			});
		});
	}

	// ---- helpers

	/**
	 * Finds the constants that are drawn as a node. Others are only the label of an edge.
	 * This has to be known before drawing, as the same constant may be a predicate and a node.
	 */
	markNodes(patterns) {
		forEachTriple(patterns, ({ subject, object }) => {
			this.scope.markUsedAsNode(subject);
			this.scope.markUsedAsNode(object);
		});
	}

	newId(kind) {
		const count = this.counters[kind] ?? 0;
		this.counters[kind] = count + 1;
		return `${this.scope.prefix}${kind}${count}`;
	}

	/** @param {import('./graph.js').Item} item */
	add(item) {
		this.open.at(-1).push(item);
	}

	/** Adds a group, with what draw() adds inside it. */
	group(group, draw) {
		const item = { type: 'group', ...group, items: [] };
		this.add(item);
		this.open.push(item.items);
		draw();
		this.open.pop();
	}
}

/**
 * Turns a triple whose subject or object is a [ ... ] or ( ... ) into plain triples,
 * the Traqula AST keeps these nested.
 */
export function expandTriple(triple) {
	const nested = [];
	const resolve = (term) => {
		if (term.type === 'tripleCollection') {
			nested.push(...term.triples.flatMap(expandTriple));
			return term.identifier;
		}
		return term;
	};
	const subject = resolve(triple.subject);
	const object = resolve(triple.object);
	return [{ subject, predicate: triple.predicate, object }, ...nested];
}

/** Calls the function with every triple in the patterns, except in EXISTS clauses. */
export function forEachTriple(patterns, callback) {
	for (const pattern of patterns) {
		if (pattern.subType === 'bgp') {
			pattern.triples.flatMap(expandTriple).forEach(callback);
		} else if (pattern.type === 'query') {
			forEachTriple(pattern.where ? [pattern.where] : [], callback);
		} else if (pattern.patterns) {
			forEachTriple(pattern.patterns, callback);
		}
	}
}

/**
 * Adds the names of the variables that a query pattern binds, which is what SELECT * returns.
 * A variable that is only used in a FILTER, in EXISTS or in MINUS is not in scope.
 */
export function inScopeVariables(patterns, names = new Set()) {
	const add = (term) => term.subType === 'variable' && names.add(term.value);
	for (const pattern of patterns) {
		switch (pattern.subType) {
			case 'bgp':
				for (const { subject, predicate, object } of pattern.triples.flatMap(expandTriple)) {
					add(subject);
					add(predicate);
					add(object);
				}
				break;
			case 'bind':
				add(pattern.variable);
				break;
			case 'values':
				pattern.variables.forEach(add);
				break;
			case 'minus':
			case 'filter':
				break;
			case 'graph':
			case 'service':
				add(pattern.name); // GRAPH ?g and SERVICE ?endpoint
				inScopeVariables(pattern.patterns, names);
				break;
			default:
				if (pattern.type === 'query') {
					for (const variable of pattern.variables) {
						if (variable.type === 'wildcard') {
							inScopeVariables(pattern.where ? [pattern.where] : [], names);
						} else {
							add(variable.subType === 'bind' ? variable.variable : variable);
						}
					}
				} else if (pattern.patterns) {
					inScopeVariables(pattern.patterns, names);
				}
		}
	}
	return names;
}

/** Adds the names of the variables used in a graph pattern, and in the EXISTS clauses in it, to the set. */
export function variablesOf(node, names = new Set()) {
	if (Array.isArray(node)) {
		node.forEach((child) => variablesOf(child, names));
	} else if (node && typeof node === 'object') {
		if (node.type === 'term' && node.subType === 'variable') {
			names.add(node.value);
		} else {
			for (const [key, child] of Object.entries(node)) {
				if (key !== 'loc') {
					variablesOf(child, names);
				}
			}
		}
	}
	return names;
}
