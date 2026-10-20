import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sparqlToElk, sparqlToSvg } from '../src/svg-index.js';

const P = 'PREFIX ex: <http://example.org/>\n';

/** id of every node of an ELK graph to the id of the ELK node it is in, and the nodes by id */
function parents(elk) {
	const parentOf = new Map();
	const byId = new Map();
	(function visit(node) {
		for (const child of node.children ?? []) {
			parentOf.set(child.id, node.id);
			byId.set(child.id, child);
			visit(child);
		}
	})(elk);
	return { parentOf, byId };
}

/** the id of the ELK node for a variable */
const variable = (elk, name) => [...parents(elk).byId.values()].find((node) => node.sparql?.lines?.[0] === '?' + name)?.id;

test('a variable used outside an OPTIONAL is outside it, one only used in it is in it', () => {
	const elk = sparqlToElk(P + 'SELECT * WHERE { ?s ex:a ?x OPTIONAL { ?s ex:b ?c . ?c ex:d ?d } }');
	const { parentOf } = parents(elk);
	assert.equal(parentOf.get(variable(elk, 's')), 'root');
	assert.equal(parentOf.get(variable(elk, 'x')), 'root');
	assert.equal(parentOf.get(variable(elk, 'c')), 'optional0');
	assert.equal(parentOf.get(variable(elk, 'd')), 'optional0');
});

test('a variable used in two branches of a UNION is in the union, not in a branch', () => {
	const elk = sparqlToElk(P + 'SELECT * WHERE { { ?s ex:a ?both . ?s ex:c ?left } UNION { ?s ex:b ?both } }');
	const { parentOf } = parents(elk);
	assert.equal(parentOf.get(variable(elk, 'left')), 'union0l');
	assert.equal(parentOf.get(variable(elk, 'both')), 'union0');
	assert.equal(parentOf.get(variable(elk, 's')), 'union0');
});

test('A UNION B UNION C is one union with three branches, without or edges', () => {
	const elk = sparqlToElk(P + 'SELECT * WHERE { { ?s ex:a ?o } UNION { ?s ex:b ?o } UNION { ?s ex:c ?o } }');
	const unions = [...parents(elk).byId.values()].filter((node) => node.sparql?.group === 'union');
	assert.equal(unions.length, 1);
	assert.equal(unions[0].children.filter((child) => child.sparql?.group === 'unionBranch').length, 3);
	const kinds = [];
	(function visit(node) { (node.edges ?? []).forEach((edge) => kinds.push(edge.sparql.kind)); (node.children ?? []).forEach(visit); })(elk);
	assert.ok(!kinds.includes('or'));
});

test('the nodes of an EXISTS clause are in its group', () => {
	const elk = sparqlToElk(P + 'SELECT * WHERE { ?s ex:a ?o FILTER NOT EXISTS { ?s ex:b ?x } }');
	const { parentOf, byId } = parents(elk);
	const inner = [...byId.values()].filter((node) => node.id.startsWith('f0e1v'));
	assert.equal(inner.length, 2);
	inner.forEach((node) => assert.equal(parentOf.get(node.id), 'f0e1'));
	assert.equal(parentOf.get('f0'), 'root');
});

test('every edge is in the lowest common ancestor of its ends', () => {
	const elk = sparqlToElk(P + 'SELECT * WHERE { ?s ex:a ?o OPTIONAL { ?s ex:b ?c OPTIONAL { ?c ex:d ?d } } { ?o ex:e ?e } UNION { ?o ex:f ?f } }');
	const { parentOf } = parents(elk);
	const ancestors = (id) => { const list = []; for (let at = id; at; at = parentOf.get(at)) list.push(at); list.push('root'); return list; };
	(function visit(node) {
		for (const edge of node.edges ?? []) {
			const a = ancestors(parentOf.get(edge.sources[0]) ?? 'root');
			const b = new Set(ancestors(parentOf.get(edge.targets[0]) ?? 'root'));
			assert.equal(node.id, a.find((x) => b.has(x)), `${edge.sources[0]} -> ${edge.targets[0]}`);
		}
		(node.children ?? []).forEach(visit);
	})(elk);
});

test('long VALUES lists are cut short, to keep the diagram readable', () => {
	const values = Array.from({ length: 15 }, (_, i) => `ex:v${i}`).join(' ');
	const elk = sparqlToElk(P + `SELECT * WHERE { VALUES ?x { ${values} } ?x ex:p ?o }`);
	const labels = [...parents(elk).byId.values()].map((node) => node.sparql?.lines?.[0]);
	assert.equal(labels.filter((label) => /^ex:v\d+$/.test(label)).length, 6);
	assert.ok(labels.includes('… and 9 more'));
	const all = sparqlToElk(P + `SELECT * WHERE { VALUES ?x { ${values} } ?x ex:p ?o }`, { maxValues: Infinity });
	assert.equal([...parents(all).byId.values()].filter((node) => /^ex:v\d+$/.test(node.sparql?.lines?.[0])).length, 15);
});

test('a long filter is wrapped over lines', () => {
	const elk = sparqlToElk(P + 'SELECT * WHERE { ?s ex:p ?o FILTER(?o != "a long text" && ?o != "another long text" && ?o != "and yet another") }');
	assert.ok(parents(elk).byId.get('f0').sparql.lines.length > 1);
});

test('the SVG has every node and edge, and edge labels', async () => {
	const svg = await sparqlToSvg(P + 'SELECT ?s WHERE { ?s ex:a ex:C ; ex:b/ex:c ?o ; ?p "lit" OPTIONAL { ?o ex:d ?d } FILTER(?o > 1) BIND(STR(?o) AS ?t) }');
	assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="\d+"/);
	for (const text of ['?s', '?o', '?d', '?p', '?t', 'ex:C', 'lit', 'ex:a', 'ex:b', 'ex:c', 'ex:d', '(optional)', 'str(?o)', 'as']) {
		assert.ok(svg.includes(`>${text}</tspan>`) || svg.includes(`>${text}</text>`), text);
	}
	assert.equal((svg.match(/<g class="node /g) || []).length, 10); // ?s ?o ?d ?p ?t, ex:C, "lit", the path node, filter, bind
	// 6 for triples (a path of two steps, a variable predicate drawn as two edges), 1 for the filter, 2 for the bind
	assert.equal((svg.match(/<path class="edge /g) || []).length, 9);
	assert.match(svg, /class="edge triple" d="[^"]+" fill="none" stroke="[^"]+" stroke-width="1.3" stroke-dasharray="3 3"/); // in the OPTIONAL
});

test('the SVG escapes text, and ids are unique per diagram', async () => {
	const svg = await sparqlToSvg(P + 'SELECT * WHERE { ?s ex:p "a <b> & \\"c\\"" }', { idPrefix: 'one-', title: 'A & B' });
	assert.ok(svg.includes('a &lt;b&gt; &amp; &quot;c&quot;'));
	assert.ok(svg.includes('<title>A &amp; B</title>'));
	assert.ok(svg.includes('id="one-arrow"') && svg.includes('url(#one-arrow)'));
	const other = await sparqlToSvg(P + 'SELECT * WHERE { ?s ex:p ?o }');
	assert.notEqual(/id="([^"]*)arrow"/.exec(other)[1], 'one-');
});

test('a theme changes the colours', async () => {
	const svg = await sparqlToSvg(P + 'SELECT ?s WHERE { ?s ex:p ?o }', { theme: { colors: { projected: '#123456' } } });
	assert.match(svg, /fill="#123456"/);
});

test('invalid SPARQL is rejected', async () => {
	await assert.rejects(() => sparqlToSvg('SELECT ?s WHERE {'), /Parse error|Expecting|mismatched/i);
});
