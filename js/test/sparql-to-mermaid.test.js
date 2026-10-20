import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sparqlToMermaid, sparqlToMermaidLines } from '../src/index.js';

const P = 'PREFIX ex: <http://example.org/>\n';

/** the diagram as lines with the indentation removed, which only shows nesting */
const draw = (query, options) => sparqlToMermaidLines(P + query, options).map((line) => line.trim());

// ---- the queries of the Java tests, SparqlInRdfToMermaidTest

test('simple, prefixes of the query are used', () => {
	const diagram = sparqlToMermaid(`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		PREFIX SWISSLIPID: <https://swisslipids.org/rdf/SLM_>
		SELECT ?category ?label
		WHERE { ?category SWISSLIPID:rank SWISSLIPID:Category . ?category rdfs:label ?label . }`);
	assert.match(diagram, /SWISSLIPID:/);
	assert.match(diagram, /--"rdfs:label"-->/);
});

const rhea = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
	PREFIX rh: <http://rdf.rhea-db.org/>
	PREFIX ec: <http://purl.uniprot.org/enzyme/>
	SELECT ?ec ?ecNumber ?rhea ?accession ?equation
	WHERE {
	  ?rhea rdfs:subClassOf rh:Reaction .
	  ?rhea rh:accession ?accession .
	  ?rhea rh:ec ?ec .
	  BIND(strafter(str(?ec),str(ec:)) as ?ecNumber)
	  ?rhea rh:isTransport ?isTransport .
	  ?rhea rh:equation ?equation .
	}`;

test('rhea 9', () => {
	assert.match(sparqlToMermaid(rhea), /rh:ec/);
});

test('rhea 9 with an anonymous node and filters', () => {
	const diagram = sparqlToMermaid(`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
		PREFIX rh: <http://rdf.rhea-db.org/>
		SELECT ?ec ?rhea
		WHERE {
		  ?rhea rh:accession 'lala' .
		  ?rhea rh:ec ?ec .
		  ?rhea rh:isTransport ?isTransport .
		  ?rhea rh:equation [] .
		  FILTER(?isTransport = true)
		  FILTER(contains(?isTransport, "true"))
		}`);
	assert.match(diagram, /rh:ec/);
	assert.match(diagram, /\(\(" "\)\)/); // the [] is an anonymous node
});

test('filter with IN', () => {
	const diagram = sparqlToMermaid(`PREFIX ex: <http://example.org/>
		SELECT ?ex WHERE { [] ex:pred ?ex . FILTER( ?ex IN ( ex:left , ex:right )) }`);
	assert.match(diagram, /\[\["\?ex in"\]\]/);
	assert.match(diagram, /\(\["ex:left"\]\)/);
	assert.match(diagram, /\(\["ex:right"\]\)/);
});

// ---- nodes and edges

test('selected variables are green, others are not', () => {
	const lines = draw('SELECT ?s WHERE { ?s ex:p ?o }');
	assert.ok(lines.includes('v1("?s"):::projected'));
	assert.ok(lines.includes('v2("?o")'));
});

test('the header is not part of the lines', () => {
	assert.equal(sparqlToMermaid(P + 'ASK { ?s ex:p ?o }').split('\n')[0], 'graph TD');
	assert.ok(!sparqlToMermaidLines(P + 'ASK { ?s ex:p ?o }').includes('graph TD'));
});

test('rdf:type is drawn as a, and constants only used as predicates are not nodes', () => {
	const lines = draw('SELECT * WHERE { ?s a ex:C ; ex:p ?o }');
	assert.ok(lines.includes('v1 --"a"--> c1'));
	assert.ok(lines.includes('v1 --"ex:p"--> v2'));
	assert.ok(lines.includes('c1(["ex:C"]):::iri'));
	assert.ok(!lines.some((line) => line.startsWith('c2(')));
});

test('a variable predicate is a node between subject and object', () => {
	const lines = draw('SELECT * WHERE { ?s ?p ?o }');
	assert.ok(lines.includes('v1 --> v3 --> v2')); // subject, predicate, object
});

test('a constant used as predicate and as node is drawn between subject and object', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p ?o . ex:p ex:q ?x }');
	assert.ok(lines.includes('v1 --> c1 --> v2'));
	assert.ok(lines.some((line) => line.startsWith('c1(["ex:p"])')));
});

test('literals show their datatype or language, and strings are shown as they are', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p "text", 42, 1.5, true, "chat"@FR, "x"^^ex:type }');
	for (const label of ['text', '42^^xsd:integer', '1.5^^xsd:decimal', 'true^^xsd:boolean', 'chat@fr', 'x^^ex:type']) {
		assert.ok(lines.some((line) => line.includes(`(["${label}"]):::literal`)), label);
	}
});

test('blank node property lists and lists are drawn as triples', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p [ ex:q ?o ; ex:r ( ?a 1 ) ] }');
	const edges = lines.filter((line) => /-->/.test(line));
	assert.equal(edges.length, 1 + 2 + 4); // ex:p, ex:q, ex:r, and first+rest for two members
	assert.ok(lines.some((line) => line.includes('"rdf:first"')));
});

test('the same constant is one node', () => {
	const lines = draw('SELECT * WHERE { ?a ex:p ex:C . ?b ex:q ex:C }');
	assert.equal(lines.filter((line) => line.startsWith('c1(')).length, 1);
	assert.ok(!lines.some((line) => line.startsWith('c2(')));
});

test('a selected variable that no pattern uses is drawn', () => {
	assert.ok(draw('SELECT ?s ?unbound WHERE { ?s ex:p ex:o }').includes('v2("?unbound"):::projected'));
});

test('SELECT * is green for the variables of the pattern, not those only in a filter or EXISTS', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p ?o FILTER NOT EXISTS { ?s ex:q ?inner } }');
	assert.ok(lines.includes('v2("?o"):::projected'));
	assert.ok(lines.includes('v1("?s"):::projected'));
	assert.ok(lines.includes('v3("?inner")'));
});

test('DESCRIBE of a resource draws the resource', () => {
	assert.ok(draw('DESCRIBE ex:thing').includes('c1(["ex:thing"]):::projected'));
});

// ---- OPTIONAL, UNION, MINUS, SERVICE

test('every edge in an OPTIONAL is dotted', () => {
	const lines = draw('SELECT * WHERE { ?s ex:a ?x OPTIONAL { ?s ex:b ?y . ?y ex:c ?z . OPTIONAL { ?z ex:d ?w } } }');
	assert.ok(lines.includes('v1 --"ex:a"--> v2'));
	for (const predicate of ['ex:b', 'ex:c', 'ex:d']) {
		assert.ok(lines.some((line) => line.includes(`-."${predicate}".->`)), predicate);
	}
	assert.equal(lines.filter((line) => line.startsWith('subgraph optional')).length, 2);
});

test('UNION draws the alternatives in order, and nests more than two', () => {
	const lines = draw('SELECT * WHERE { { ?s ex:a ?o } UNION { ?s ex:b ?o } UNION { ?s ex:c ?o } }');
	assert.equal(lines.filter((line) => /^subgraph union\d+\[/.test(line)).length, 2);
	assert.equal(lines.filter((line) => /<== or ==>/.test(line)).length, 2);
	const order = ['ex:a', 'ex:b', 'ex:c'].map((p) => lines.findIndex((line) => line.includes(`"${p}"`)));
	assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('MINUS and SERVICE are subgraphs', () => {
	const lines = draw('SELECT * WHERE { ?s ex:a ?o MINUS { ?s ex:b ?o } SERVICE <http://other.org/sparql> { ?s ex:c ?x } }');
	assert.ok(lines.some((line) => line === 'subgraph minus0["MINUS"]'));
	assert.ok(lines.some((line) => line === 'subgraph s0["http://other.org/sparql"]'));
	assert.ok(lines.some((line) => line.startsWith('style s0 ')));
});

test('GRAPH is not drawn, but its triples are', () => {
	const lines = draw('SELECT * WHERE { GRAPH <http://g.org/> { ?s ex:a ?o } }');
	assert.ok(lines.includes('v1 --"ex:a"--> v2'));
});

test('a sub select is drawn as part of the query, with its own expressions', () => {
	const lines = draw('SELECT ?m WHERE { { SELECT ?a (MAX(?b) AS ?m) WHERE { ?a ex:x ?b } GROUP BY ?a } ?a ex:y ?m }');
	assert.ok(lines.some((line) => /^bind0\[\/"max\(\?b\)"\/\]$/.test(line)));
	assert.ok(lines.some((line) => line.includes('"ex:y"')));
});

// ---- FILTER, BIND, VALUES

test('a filter is a node linked to its variables', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p ?o FILTER(?o > 1 && regex(str(?s), "x", "i")) }');
	assert.ok(lines.includes('f0[["(?o > \'1^^xsd:integer\' && regex(str(?s),\'x\',\'i\'))"]]'.replace(/>/g, '#gt;')));
	assert.ok(lines.includes('f0 --> v2'));
	assert.ok(lines.includes('f0 --> v1'));
});

test('expressions keep their structure', () => {
	const text = (filter) => draw(`SELECT * WHERE { ?s ex:p ?o FILTER(${filter}) }`).find((line) => /^f0\[\[/.test(line));
	const one = "'1^^xsd:integer'", two = "'2^^xsd:integer'", three = "'3^^xsd:integer'";
	assert.equal(text('(?o + 1) * 2 > 3'), `f0[["(?o + ${one}) * ${two} #gt; ${three}"]]`);
	assert.equal(text('?o + 1 * 2 > 3'), `f0[["?o + ${one} * ${two} #gt; ${three}"]]`);
	assert.equal(text('!BOUND(?o)'), 'f0[["not bound(?o)"]]');
	assert.equal(text('?o = 1 || ?o = 2 || ?o = 3'), `f0[["(?o = ${one} || ?o = ${two} || ?o = ${three})"]]`);
	assert.equal(text('?o NOT IN (1, ?s)'), 'f0[["?o not in"]]');
});

test('NOT EXISTS is a subgraph with nodes of its own, drawn once', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p ?o FILTER NOT EXISTS { ?s ex:q ?x } }');
	assert.ok(lines.includes('f0[["not exists"]]'));
	assert.ok(lines.includes('subgraph f0e1["Not Exists Clause"]'));
	assert.ok(lines.includes('f0 --"NOT EXISTS"--> f0e1'));
	assert.equal(lines.filter((line) => line.includes('"ex:q"')).length, 1);
	assert.ok(lines.includes('f0e1v1 --"ex:q"--> f0e1v2'));
	assert.ok(lines.includes('f0 --> v1')); // the shared variable of the outer query
});

test('BIND is a node, between the variables it uses and the variable it binds', () => {
	const lines = draw('SELECT * WHERE { ?s ex:p ?o BIND(CONCAT(STR(?o), "!") AS ?c) }');
	assert.ok(lines.includes('bind0[/"concat(str(?o),\'!\')"/]'));
	assert.ok(lines.includes('v2 --o bind0'));
	assert.ok(lines.includes('bind0 --as--o v3'));
});

test('(expression AS ?alias) in SELECT is drawn like BIND, and an aggregate keeps DISTINCT', () => {
	const lines = draw('SELECT (COUNT(DISTINCT ?o) AS ?n) (COUNT(*) AS ?all) WHERE { ?s ex:p ?o }');
	assert.ok(lines.includes('bind0[/"count(distinct ?o)"/]'));
	assert.ok(lines.includes('bind1[/"count(*)"/]'));
	assert.ok(lines.includes('bind0 --as--o v3'));
	assert.ok(lines.includes('v2("?o"):::projected')); // as in the Java version, the variables of the expression
});

test('HAVING is a filter', () => {
	const lines = draw('SELECT ?s WHERE { ?s ex:p ?o } GROUP BY ?s HAVING (COUNT(?o) > 1)');
	assert.ok(lines.some((line) => /^f0\[\["count\(\?o\) #gt; /.test(line)));
});

test('VALUES is a node with the values, UNDEF is skipped', () => {
	const lines = draw('SELECT * WHERE { VALUES (?a ?b) { (ex:x "y") (UNDEF 2) } ?a ex:p ?b }');
	assert.ok(lines.includes('values0[/"VALUES ?a ?b"/]'));
	assert.ok(lines.includes('values0 --> v1'));
	assert.ok(lines.includes('values0r1c1(["ex:x"])'));
	assert.ok(lines.includes('values0r1c2(["y"])'));
	assert.ok(!lines.some((line) => line.startsWith('values0r2c1')));
	assert.ok(lines.includes('values0r2c2(["2^^xsd:integer"])'));
});

// ---- property paths

test('a sequence goes through anonymous nodes', () => {
	const lines = draw('SELECT * WHERE { ?s ex:a/ex:b/ex:c ?o }');
	assert.ok(lines.includes('v1 --"ex:a"--> a1'));
	assert.ok(lines.includes('a1 --"ex:b"--> a2'));
	assert.ok(lines.includes('a2 --"ex:c"--> v2'));
});

test('an inverse path swaps subject and object, also of a sequence', () => {
	assert.ok(draw('SELECT * WHERE { ?s ^ex:a ?o }').includes('v2 --"ex:a"--> v1'));
	const lines = draw('SELECT * WHERE { ?s ^(ex:a/ex:b) ?o }');
	assert.ok(lines.includes('v2 --"ex:a"--> a1'));
	assert.ok(lines.includes('a1 --"ex:b"--> v1'));
});

test('an alternative path is a union', () => {
	const lines = draw('SELECT * WHERE { ?s (ex:a|ex:b/ex:c) ?o }');
	assert.equal(lines.filter((line) => /<== or ==>/.test(line)).length, 1);
	assert.ok(lines.includes('v1 --"ex:a"--> v2'));
	assert.ok(lines.includes('v1 --"ex:b"--> a1'));
});

test('*, + and ? are part of the label of the edge', () => {
	for (const modifier of ['*', '+', '?']) {
		assert.ok(draw(`SELECT * WHERE { ?s ex:a${modifier} ?o }`).includes(`v1 --"ex:a${modifier}"--> v2`), modifier);
	}
	assert.ok(draw('SELECT * WHERE { ?s (ex:a/ex:b)* ?o }').includes('v1 --"(ex:a/ex:b)*"--> v2'));
	assert.ok(draw('SELECT * WHERE { ?s !(ex:a|^ex:b) ?o }').includes('v1 --"!(ex:a|^ex:b)"--> v2'));
});

// ---- prefixes, escaping, errors

test('prefixes of the option replace those of the query', () => {
	const query = 'PREFIX ex: <http://example.org/> SELECT * WHERE { ?s ex:p ?o }';
	assert.match(sparqlToMermaid(query), /"ex:p"/);
	assert.match(sparqlToMermaid(query, { prefixes: { other: 'http://example.org/' } }), /"other:p"/);
	assert.match(sparqlToMermaid(query, { prefixes: new Map([['other:', 'http://example.org/']]) }), /"other:p"/);
	assert.match(sparqlToMermaid(query, { prefixes: {} }), /"http:\/\/example.org\/p"/);
});

test('rdf, rdfs, owl, xsd and fn need no declaration, as in the Java version, and a declaration replaces them', () => {
	const lines = draw('SELECT * WHERE { ?s rdfs:label "x"^^xsd:string ; owl:sameAs ?o FILTER(fn:contains(?s, "a")) }');
	assert.ok(lines.includes('v1 --"rdfs:label"--> c1'));
	assert.ok(lines.includes('v1 --"owl:sameAs"--> v2'));
	assert.ok(lines.includes('f0[["fn:contains(?s,\'a\')"]]'));
	assert.match(sparqlToMermaid('PREFIX rdfs: <http://other.org/> SELECT * WHERE { ?s rdfs:label ?o }',
		{ prefixes: { rdfs: 'http://other.org/' } }), /"rdfs:label"/);
	assert.match(sparqlToMermaid('PREFIX rdfs: <http://other.org/> SELECT * WHERE { ?s rdfs:label ?o }', { prefixes: {} }),
		/"http:\/\/other\.org\/label"/);
});

test('the shortest namespace that matches is used, as in the Java version', () => {
	const query = 'SELECT * WHERE { ?s <http://a.org/b/p> ?o }';
	assert.match(sparqlToMermaid(query, { prefixes: { long: 'http://a.org/b/', short: 'http://a.org/' } }), /"short:b\/p"/);
});

test('relative IRIs are resolved against the base', () => {
	const query = 'SELECT * WHERE { <rel> <p> ?o }';
	assert.match(sparqlToMermaid(query, { base: 'http://base.org/dir/' }), /"http:\/\/base\.org\/dir\/rel"/);
	assert.match(sparqlToMermaid('BASE <http://own.org/> ' + query, { base: 'http://base.org/' }), /"http:\/\/own\.org\/p"/);
});

test('labels cannot break the diagram', () => {
	const lines = draw(`SELECT * WHERE { ?s ex:p "" , "a \\"b\\" [c] <d> \`e\`" , "two\\nlines" FILTER(CONTAINS(?s, "\\"<>")) }`);
	assert.ok(lines.includes('c1(["#quot;#quot;"]):::literal'));
	assert.ok(lines.includes('c2(["a #quot;b#quot; #91;c#93; #lt;d#gt; #96;e#96;"]):::literal'));
	assert.ok(lines.includes('c3(["two lines"]):::literal'));
	assert.ok(lines.some((line) => line.startsWith('f0[["contains(?s,\'#quot;#lt;#gt;\')"]]')));
	// no unescaped quote inside any label: an even number of quote characters on every line
	for (const line of lines) {
		assert.equal((line.match(/"/g) ?? []).length % 2, 0, line);
	}
});

test('invalid SPARQL is an error', () => {
	assert.throws(() => sparqlToMermaid('SELECT ?s WHERE {'), /Parse error|Expecting|mismatched/i);
	assert.throws(() => sparqlToMermaid('SELECT * WHERE { ?s nope:p ?o }'), /prefix/i);
	assert.throws(() => sparqlToMermaid('SELECT * WHERE { ?s ex:p ?o }'), /prefix/i); // not a default prefix
});
