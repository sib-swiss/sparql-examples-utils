import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sparqlToMermaidLines } from '../src/index.js';
import { differences, highlighted, structure } from '../compare/structure.js';
import { compareTriples, hasCollidingIds, normalizeLabel, tripleEdges } from '../compare/triples.js';

// What the Java version draws for `?s a <http://e.org/C> ; <http://e.org/p> ?o . OPTIONAL { ?s <http://e.org/q> "x"@en , "" }`
const java = [
	'classDef projected fill:lightgreen;',
	'  v1("?o"):::projected',
	'  v2("?s")',
	'  c1(["http://e.org/C"]):::iri',
	'  c2(["x@en"]):::literal',
	'  c3(["#quot;#quot;"]):::literal',
	'  v2 --"a"--> c1',
	'  v2 --"http://e.org/p"--> v1',
	'  subgraph optional0["(optional)"]',
	'    v2 -."http://e.org/q".-> c2',
	'    v2 -."http://e.org/q".-> c3',
	'  end',
];

const js = sparqlToMermaidLines(
	'SELECT ?o WHERE { ?s a <http://e.org/C> ; <http://e.org/p> ?o . OPTIONAL { ?s <http://e.org/q> "x"@EN , "" } }',
	{ prefixes: {} });

test('the same triple patterns are found in a Java and a JavaScript diagram', () => {
	assert.deepEqual([...tripleEdges(java)].sort(), [
		'?s | a | http://e.org/C',
		'?s | http://e.org/p | ?o',
		'?s | http://e.org/q | ',
		'?s | http://e.org/q | x@',
	]);
	assert.deepEqual(compareTriples(java, js), { onlyJava: [], onlyJs: [] });
});

test('a missing, extra or reversed edge is found', () => {
	const withoutEdge = js.filter((line) => !line.includes('"http://e.org/p"'));
	assert.deepEqual(compareTriples(java, withoutEdge).onlyJava, ['?s | http://e.org/p | ?o']);
	const reversed = js.map((line) => line.replace(/^(\s*)(v\d+) --("http:\/\/e\.org\/p")--> (v\d+)$/, '$1$4 --$3--> $2'));
	assert.deepEqual(compareTriples(java, reversed).onlyJs, ['?o | http://e.org/p | ?s']);
	assert.deepEqual(compareTriples([...java, '  v1 --"http://e.org/extra"--> v2'], js).onlyJava,
		['?o | http://e.org/extra | ?s']);
});

test('a predicate that is a node is drawn between subject and object, also in an OPTIONAL', () => {
	const nodes = ['  v1("?s")', '  v2("?p")', '  v3("?o")'];
	assert.deepEqual([...tripleEdges([...nodes, '  v1 --> v2 --> v3'])], ['?s | @?p | ?o']);
	assert.deepEqual([...tripleEdges([...nodes, '  v1 -.-> v2 -.-> v3'])], ['?s | @?p | ?o']);
	assert.deepEqual([...tripleEdges(sparqlToMermaidLines('SELECT * WHERE { ?s ?p ?o }'))], ['?s | @?p | ?o']);
});

test('filter, bind and exists edges are not triple patterns', () => {
	const lines = sparqlToMermaidLines('SELECT * WHERE { ?s <http://e.org/p> ?o FILTER NOT EXISTS { ?s <http://e.org/q> ?x } BIND(?o AS ?b) }');
	assert.deepEqual([...tripleEdges(lines, 'js')].sort(), ['?s | http://e.org/p | ?o', '?s | http://e.org/q | ?x']);
});

test('labels are compared as the text that they show', () => {
	assert.equal(normalizeLabel('"rdfs:subClassOf*"'), 'rdfs:subClassOf*'); // the modifier of a path is compared
	assert.equal(normalizeLabel('"a #quot;b#quot; #91;c#93;"'), 'a "b" [c]');
	assert.equal(normalizeLabel('"chat@fr"'), 'chat@'); // not whether the language is in capitals
	assert.equal(normalizeLabel('"#quot;#quot;"'), '');
});

test('colliding ids in a Java diagram are recognised', () => {
	assert.equal(hasCollidingIds(java), false);
	assert.equal(hasCollidingIds(['  v8("?cl"):::projected ', '  v2("?x")', '  v8("?obs")']), true);
	assert.equal(hasCollidingIds(['  c1(["a"])', '  v1("?a")', '  a1((" "))']), false);
});

test('facts about the structure and highlighting', () => {
	const lines = sparqlToMermaidLines(
		'SELECT ?s WHERE { ?s <http://e.org/p> ?o OPTIONAL { ?s <http://e.org/q> ?x } FILTER(?o > 1) FILTER NOT EXISTS { ?s <http://e.org/r> ?y } }');
	assert.deepEqual(structure(lines), { optional: 1, union: 0, minus: 0, service: 0, filters: 2, binds: 0, values: 0, exists: 1 });
	assert.equal(highlighted(lines), 's'); // not the ?s inside the EXISTS clause
	assert.deepEqual(differences(lines, lines), []);
	assert.deepEqual(differences(lines, lines.filter((line) => !line.includes('subgraph optional'))), ['optional']);
});

test('VALUES is not counted as a bind, whether it is drawn as Java does or as JavaScript does', () => {
	const jsLines = sparqlToMermaidLines('SELECT * WHERE { VALUES ?a { 1 } BIND(?a AS ?b) }');
	assert.deepEqual([structure(jsLines).binds, structure(jsLines).values], [1, 1]);
	const javaLines = ['  bind0[/VALUES ?a/]', '  bind0-->v1', '  bind1[/"?a"/]', '  v1 --o bind1'];
	assert.deepEqual([structure(javaLines).binds, structure(javaLines).values], [1, 1]);
});

test('subgraphs inside an EXISTS clause are counted, although their ids have a prefix', () => {
	const lines = sparqlToMermaidLines('SELECT * WHERE { ?s <http://e.org/p> ?o FILTER NOT EXISTS { { ?s <http://e.org/a> ?x } UNION { ?s <http://e.org/b> ?x } OPTIONAL { ?x <http://e.org/c> ?y } MINUS { ?x <http://e.org/d> ?z } SERVICE <http://s.org/> { ?x <http://e.org/e> ?w } } }');
	assert.ok(lines.some((line) => /subgraph f0e1union0\[/.test(line))); // the id has the prefix
	const facts = structure(lines);
	assert.deepEqual([facts.union, facts.optional, facts.minus, facts.service, facts.exists], [1, 1, 1, 1, 1]);
	// as Java draws them, with a different id
	const java = ['  subgraph unionf0e00[" Union "]', '  subgraph optionalf0e00["(optional)"]', '  subgraph minusf0e01["MINUS"]',
		'  subgraph s1["http://s.org/"]', '  style s1 stroke-width:4px;'];
	const javaFacts = structure(java);
	assert.deepEqual([javaFacts.union, javaFacts.optional, javaFacts.minus, javaFacts.service], [1, 1, 1, 1]);
});
