/**
 * The diagram of a query, as made by the renderer, which the backends draw.
 *
 * @typedef {object} Graph
 * @property {Declaration[]} declarations the variables, blank nodes and constants of the query
 * @property {Item[]} items what is drawn, in the order of the query
 *
 * @typedef {object} Declaration a node for a term of the query
 * @property {string} id
 * @property {'variable'|'anonymous'|'constant'} kind
 * @property {string} label the text drawn in the node, '?name' for a variable and '' for a blank node
 * @property {'projected'|'literal'|'iri'|null} style projected when the query selects it
 *
 * @typedef {GroupItem|NodeItem|EdgeItem|ChainItem} Item
 *
 * @typedef {object} GroupItem a box around what is in it
 * @property {'group'} type
 * @property {string} id
 * @property {'optional'|'union'|'unionBranch'|'minus'|'service'|'exists'} kind
 *           A union has two unionBranch groups and an 'or' edge between them
 * @property {string} title
 * @property {Item[]} items
 * @property {Declaration[]} [declarations] only for exists, which has nodes of its own
 *
 * @typedef {object} NodeItem a node that is not a term of the query
 * @property {'node'} type
 * @property {string} id
 * @property {'filter'|'bind'|'values'|'value'|'member'} kind a value is one value of a VALUES,
 *           a member a constant of an IN (...) list
 * @property {string} label
 *
 * @typedef {object} EdgeItem
 * @property {'edge'} type
 * @property {'triple'|'uses'|'input'|'as'|'member'|'exists'|'values'|'value'|'or'} kind
 *           triple: a triple pattern, from subject to object; uses: from a filter to a variable it uses;
 *           input: from a variable to the bind that uses it; as: from a bind to the variable it binds;
 *           member: from an IN member to its filter; exists: from a filter to its EXISTS group;
 *           values: from VALUES to a variable; value: from a value to its VALUES; or: between union branches
 * @property {string} from
 * @property {string} to
 * @property {string} [label] for triple and exists edges
 * @property {boolean} [dotted] a triple pattern in an OPTIONAL
 *
 * @typedef {object} ChainItem a triple pattern whose predicate is a node too: from, middle and to
 * @property {'chain'} type
 * @property {string} from
 * @property {string} middle
 * @property {string} to
 * @property {boolean} dotted
 */

/**
 * Calls visit(item, path) for every item, depth first and in order, where path is the list of the
 * groups that the item is in, the outermost first.
 * @param {Item[]} items
 * @param {(item: Item, path: GroupItem[]) => void} visit
 */
export function walk(items, visit, path = []) {
	for (const item of items) {
		visit(item, path);
		if (item.type === 'group') {
			walk(item.items, visit, [...path, item]);
		}
	}
}
