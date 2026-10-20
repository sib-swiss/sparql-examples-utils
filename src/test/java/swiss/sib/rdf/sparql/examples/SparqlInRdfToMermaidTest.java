package swiss.sib.rdf.sparql.examples;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;
import org.junit.jupiter.api.Test;

import swiss.sib.rdf.sparql.examples.mermaid.SparqlInRdfToMermaid;

public class SparqlInRdfToMermaidTest {

	@Test
	public void simple() {
		Model model = parse(ExamplesUsedInTest.simple);
		assertTrue(SparqlInRdfToMermaid.asMermaid(model).contains("SWISSLIPID:"));
	}

	@Test
	public void rhea9() {
		Model model = parse(ExamplesUsedInTest.rhea9);
		String res = SparqlInRdfToMermaid.asMermaid(model);
		assertTrue(res.contains("rh:ec"));
	}

	@Test
	public void rhea9Anon() {
		Model model = parse(ExamplesUsedInTest.rhea9Anon);
		String res = SparqlInRdfToMermaid.asMermaid(model);
		assertTrue(res.contains("rh:ec"));
	}

	private Model parse(String ttl) {
		RDFParser rdfParser = Rio.createParser(RDFFormat.TURTLE);
		Model model = new LinkedHashModel();
		rdfParser.setRDFHandler(new StatementCollector(model));
		try (InputStream newInputStream = new ByteArrayInputStream(ttl.getBytes(StandardCharsets.UTF_8))) {
			rdfParser.parse(newInputStream);
		} catch (RDFParseException | RDFHandlerException | IOException e) {
			fail(e);
		}
		return model;
	}

	
	String filterIn = """
	prefix ex: <https://sparql.rhea-db.org/.well-known/sparql-examples/>
	prefix sh: <http://www.w3.org/ns/shacl#>
	prefix schema:<https://schema.org/>
	prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
	prefix rdfs:<http://www.w3.org/2000/01/rdf-schema#>

	ex:9
	    a sh:SPARQLSelectExecutable, sh:SPARQLExecutable ;
	     sh:select '''
			PREFIX ex: <http://example.org/>
			SELECT ?ex 
			WHERE{
				[] ex:pred ?ex .
			    FILTER( ?ex IN ( ex:left , ex:right ))
			}''' .""";

	String overlappingPrefixes = """
	prefix ex: <https://sparql.example.org/.well-known/sparql-examples/>
	prefix sh: <http://www.w3.org/ns/shacl#>
	prefix xsd: <http://www.w3.org/2001/XMLSchema#>
	_:prefixes sh:declare _:short , _:long .
	_:short sh:prefix "short" ; sh:namespace "http://a.org/"^^xsd:anyURI .
	_:long sh:prefix "long" ; sh:namespace "http://a.org/b/"^^xsd:anyURI .
	ex:1
	    a sh:SPARQLSelectExecutable, sh:SPARQLExecutable ;
	    sh:prefixes _:prefixes ;
	    sh:select '''PREFIX short: <http://a.org/>
	PREFIX long: <http://a.org/b/>
	SELECT ?s WHERE { ?s long:p <http://a.org/c/q> }''' .""";

	@Test
	public void longestNamespaceIsUsed() {
		String res = SparqlInRdfToMermaid.asMermaid(parse(overlappingPrefixes));
		assertTrue(res.contains("long:p"), res);
		assertTrue(res.contains("short:c/q"), res);
	}

	/**
	 * The diagram of a select query. The prefix ex is declared in the RDF, which is where the diagram gets its prefixes.
	 */
	private List<String> draw(String query) {
		String ttl = """
				prefix ex: <https://sparql.example.org/.well-known/sparql-examples/>
				prefix sh: <http://www.w3.org/ns/shacl#>
				prefix xsd: <http://www.w3.org/2001/XMLSchema#>
				_:prefixes sh:declare _:ex .
				_:ex sh:prefix "ex" ; sh:namespace "http://example.org/"^^xsd:anyURI .
				ex:1 a sh:SPARQLSelectExecutable, sh:SPARQLExecutable ;
				    sh:prefixes _:prefixes ;
				    sh:select '''PREFIX ex: <http://example.org/>
				""" + query + "''' .";
		List<String> lines = SparqlInRdfToMermaid.asMermaid(parse(ttl)).lines().map(String::trim).toList();
		// nothing of rdf4j's inside, and every node has an id of its own
		for (String line : lines) {
			assertFalse(line.contains("_anon_") || line.contains("_const_") || line.contains("_describe_")
					|| line.contains("ERROR") || line.contains("null"), line);
			assertEquals(0, line.chars().filter(c -> c == '"').count() % 2, "unbalanced quotes: " + line);
		}
		Set<String> ids = new HashSet<>();
		for (String line : lines) {
			Matcher declaration = Pattern.compile("^(\\S+?)\\(+\"").matcher(line);
			if (declaration.find() && declaration.group(1).length() < 12) {
				assertTrue(ids.add(declaration.group(1)), "an id for two nodes: " + line);
			}
		}
		return lines;
	}

	@Test
	public void everyEdgeInAnOptionalIsDotted() {
		List<String> lines = draw("SELECT * WHERE { ?s ex:a ?x OPTIONAL { ?s ex:b ?y . ?y ex:c ?z OPTIONAL { ?z ex:d ?w } } }");
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+ --\"ex:a\"--> v\\d+")), lines.toString());
		for (String predicate : List.of("ex:b", "ex:c", "ex:d")) {
			assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+ -\\.\"" + predicate + "\"\\.-> v\\d+")), predicate);
		}
	}

	@Test
	public void aFilterInAnOptionalIsDrawn() {
		List<String> lines = draw("SELECT * WHERE { ?s ex:a ?x OPTIONAL { ?s ex:b ?y FILTER(?y > 1) } }");
		int optional = lines.indexOf("subgraph optional0[\"(optional)\"]");
		int filter = lines.indexOf("f0[[\"?y #gt; '1^^xsd:integer'\"]]");
		assertTrue(optional >= 0 && filter > optional && filter < lines.indexOf("end"), lines.toString());
	}

	@Test
	public void existsIsDrawnOnceAsASubgraph() {
		List<String> lines = draw("SELECT * WHERE { ?s ex:a ?o FILTER NOT EXISTS { ?s ex:b ?x } FILTER EXISTS { ?s ex:c ?y } }");
		assertEquals(1, lines.stream().filter(l -> l.contains("\"ex:b\"")).count(), lines.toString());
		assertEquals(1, lines.stream().filter(l -> l.contains("\"ex:c\"")).count(), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("subgraph f\\d+e\\d+\\[\"Not Exists Clause\"]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("subgraph f\\d+e\\d+\\[\"Exists Clause\"]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("f\\d+\\[\\[\"not exists\"]]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("f\\d+\\[\\[\"exists\"]]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("f\\d+ --\"NOT EXISTS\"--> f\\de\\d+")), lines.toString());
	}

	@Test
	public void nestedExistsIsDrawnOnce() {
		List<String> lines = draw("SELECT * WHERE { ?s ex:a ?o FILTER NOT EXISTS { ?s ex:b ?x FILTER NOT EXISTS { ?x ex:c ?y } } }");
		assertEquals(2, lines.stream().filter(l -> l.contains("Exists Clause")).count(), lines.toString());
		assertEquals(1, lines.stream().filter(l -> l.contains("\"ex:c\"")).count(), lines.toString());
	}

	@Test
	public void variablesDoNotShareANode() {
		// ?c is used before it is bound, so rdf4j meets it before the BIND does, and ?marker the same in VALUES.
		// That used to give two variables the same id.
		List<String> lines = draw("""
				SELECT ?a ?b ?c ?marker WHERE {
				  ?a ex:p ?b . FILTER(?c > 1 && ?marker != ex:none)
				  BIND(?b AS ?c) BIND(CONCAT(?a, ?b, ?c) AS ?d)
				  ?d ex:q ?e . OPTIONAL { ?e ex:r ?f } VALUES ?marker { ex:x } ?f ex:s ?g }""");
		for (String name : List.of("a", "b", "c", "d", "e", "f", "g", "marker")) {
			assertEquals(1, lines.stream().filter(l -> l.matches("v\\d+\\(\"\\?" + name + "\"\\).*")).count(), name);
		}
	}

	@Test
	public void propertyPathModifiersAreInTheLabel() {
		List<String> lines = draw("""
				SELECT * WHERE { ?a ex:p* ?b . ?b ex:q+ ?c . ?c ex:r? ?d . ?d (^ex:s)* ?e .
				  ?e (ex:t/ex:u)* ?f . ?f (ex:v|ex:w)+ ?g . ?g (ex:x/ex:y)? ?h . ?h ex:z/(ex:aa|ex:bb)* ?i }""");
		for (String label : List.of("ex:p*", "ex:q+", "ex:r?", "^ex:s*", "(ex:t/ex:u)*", "(ex:v|ex:w)+", "(ex:x/ex:y)?",
				"(ex:aa|ex:bb)*")) {
			assertTrue(lines.stream().anyMatch(l -> l.matches("\\S+ --\"" + Pattern.quote(label) + "\"--> \\S+")), label);
		}
		assertFalse(lines.stream().anyMatch(l -> l.contains("Union")), "a path that ends in ? is not a union");
	}

	@Test
	public void negatedPropertySetIsAnEdge() {
		List<String> lines = draw("SELECT * WHERE { ?s !(ex:a|ex:b) ?o . ?o !ex:c ?p }");
		assertTrue(lines.stream().anyMatch(l -> l.matches("\\S+ --\"!\\(ex:a\\|ex:b\\)\"--> \\S+")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("\\S+ --\"!ex:c\"--> \\S+")), lines.toString());
		assertFalse(lines.stream().anyMatch(l -> l.contains("f0[[")), "no filter for it");
	}

	@Test
	public void aVariablePredicateIsBetweenSubjectAndObject() {
		List<String> lines = draw("SELECT * WHERE { ?s ?p ?o OPTIONAL { ?o ?q ?r } }");
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+ --> v\\d+ --> v\\d+")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+ -\\.-> v\\d+ -\\.-> v\\d+")), "dotted in the optional");
	}

	@Test
	public void labelsAreQuotedAndEscaped() {
		List<String> lines = draw("""
				SELECT * WHERE { ?s ex:a "", "chat"@fr, "with \\\\"quotes\\\\" <angle> [brackets]", "x"^^ex:custom, 1.5 .
				  OPTIONAL { ?s <http://example.org/with.dots/p> <http://other.org/o.1> } }""");
		for (String node : List.of("[\"#quot;#quot;\"]", "[\"chat@fr\"]",
				"[\"with #quot;quotes#quot; #lt;angle#gt; #91;brackets#93;\"]", "[\"x^^ex:custom\"]", "[\"1.5^^xsd:decimal\"]")) {
			assertTrue(lines.stream().anyMatch(l -> l.contains("(" + node + ")")), node + " in " + lines);
		}
		// a dotted edge with dots in its label, which mermaid can not read without the quotes
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+ -\\.\"ex:with\\.dots/p\"\\.-> c\\d+")), lines.toString());
		// and one without a prefix
		assertTrue(lines.stream().anyMatch(l -> l.matches("c\\d+\\(\\[\"http://other\\.org/o\\.1\"]\\):::iri")), lines.toString());
	}

	@Test
	public void unionAlternativesAreInTheOrderOfTheQuery() {
		List<String> lines = draw("SELECT * WHERE { { ?s ex:first ?o } UNION { ?s ex:second ?o } UNION { ?s ex:third ?o } }");
		int first = lines.indexOf(lines.stream().filter(l -> l.contains("ex:first")).findFirst().orElseThrow());
		int second = lines.indexOf(lines.stream().filter(l -> l.contains("ex:second")).findFirst().orElseThrow());
		int third = lines.indexOf(lines.stream().filter(l -> l.contains("ex:third")).findFirst().orElseThrow());
		assertTrue(first < second && second < third, lines.toString());
		assertEquals(2, lines.stream().filter(l -> l.matches("subgraph union\\w+\\[\" Union \"]")).count());
	}

	@Test
	public void expressionsKeepAllTheirParts() {
		List<String> lines = draw("""
				SELECT * WHERE { ?s ex:a ?o
				  FILTER(?o > 1 && LANG(?o) = "en" && DATATYPE(?o) = ex:t && COALESCE(?o, ?s) && !BOUND(?s))
				  FILTER((?o + 1) * 2 > 3 - (?o - 1) && ?o / 2 < 4 && !(?o = 1))
				  BIND(IRI(CONCAT(STR(?o), "-", STRLEN(?s))) AS ?i)
				  BIND(SUBSTR(UCASE(?s), 2) AS ?u) }""");
		assertTrue(lines.stream().anyMatch(l -> l.matches("f\\d+\\[\\[\"\\(\\?o #gt; '1\\^\\^xsd:integer' && lang\\(\\?o\\) = 'en' && "
				+ "datatype\\(\\?o\\) = 'ex:t' && coalesce\\(\\?o,\\?s\\) && not bound\\(\\?s\\)\\)\"]]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.endsWith("[[\"((?o + '1^^xsd:integer') * '2^^xsd:integer' #gt; '3^^xsd:integer' - "
				+ "(?o - '1^^xsd:integer') && ?o / '2^^xsd:integer' #lt; '4^^xsd:integer' && not (?o = '1^^xsd:integer'))\"]]")),
				lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("bind\\d+\\[/\"iri\\(concat\\(str\\(\\?o\\),'-',strlen\\(\\?s\\)\\)\\)\"/]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("bind\\d+\\[/\"substr\\(ucase\\(\\?s\\),'2\\^\\^xsd:integer'\\)\"/]")), lines.toString());
	}

	@Test
	public void havingOrderByAndAggregatesInAnExpressionAreShownAsTheExpression() {
		List<String> lines = draw("""
				SELECT ?s (COUNT(DISTINCT ?o) AS ?n) (CONCAT(STR(SAMPLE(?o)), "...") AS ?sample)
				WHERE { ?s ex:a ?o } GROUP BY ?s HAVING (COUNT(?o) >= 5 && MAX(?o) < 10) ORDER BY DESC(COUNT(*))""");
		assertTrue(lines.contains("f0[[\"(count(?o) #gt;= '5^^xsd:integer' && max(?o) #lt; '10^^xsd:integer')\"]]"),
				lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("bind\\d+\\[/\"count\\(distinct \\?o\\)\"/]")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("bind\\d+\\[/\"concat\\(str\\(sample\\(\\?o\\)\\),'\\.\\.\\.'\\)\"/]")),
				lines.toString());
		assertEquals(2, lines.stream().filter(l -> l.matches("bind\\d+\\[/.*")).count(), "no node for ORDER BY: " + lines);
		// the variable of the aggregate is green, the alias is not
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+\\(\"\\?o\"\\):::projected")), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+\\(\"\\?n\"\\)")), lines.toString());
	}

	@Test
	public void valuesWithoutAValueAndAServiceWithAVariable() {
		List<String> lines = draw("SELECT * WHERE { VALUES (?a ?b) { (ex:x UNDEF) (UNDEF 1) } ?a ex:p ?b SERVICE ?endpoint { ?b ex:q ?c } }");
		assertTrue(lines.contains("bind0[/\"VALUES ?a ?b\"/]"), lines.toString());
		assertEquals(2, lines.stream().filter(l -> l.matches("bind0r\\dc\\d\\(\\[.*")).count(), "one node for each value: " + lines);
		assertTrue(lines.stream().anyMatch(l -> l.matches("subgraph s\\d+\\[\"\\?endpoint\"]")), lines.toString());
	}

	@Test
	public void aSelectedVariableThatIsNotUsedIsDrawn() {
		List<String> lines = draw("SELECT ?s ?unbound WHERE { ?s ex:p ex:o }");
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+\\(\"\\?unbound\"\\):::projected")), lines.toString());
	}

	@Test
	public void onlyWhatConstructSelectsIsGreen() {
		String ttl = """
				prefix ex: <https://sparql.example.org/.well-known/sparql-examples/>
				prefix sh: <http://www.w3.org/ns/shacl#>
				ex:ask a sh:SPARQLAskExecutable, sh:SPARQLExecutable ;
				    sh:ask 'ASK { ?s <http://example.org/p> ?o }' .
				ex:construct a sh:SPARQLConstructExecutable, sh:SPARQLExecutable ;
				    sh:construct 'CONSTRUCT { ?s <http://example.org/a> ?o . ?o <http://example.org/b> ?s } WHERE { ?s <http://example.org/p> ?o . ?o <http://example.org/q> ?hidden }' .""";
		List<String> lines = SparqlInRdfToMermaid.asMermaid(parse(ttl)).lines().map(String::trim).toList();
		// a variable of an ASK is not selected, so only the two of the construct are green
		assertEquals(2, lines.stream().filter(l -> l.contains(":::projected")).count(), lines.toString());
		assertTrue(lines.stream().anyMatch(l -> l.matches("v\\d+\\(\"\\?hidden\"\\)")), lines.toString());
	}

	@Test
	public void filterIn() {
		Model model = parse(filterIn);
		String res = SparqlInRdfToMermaid.asMermaid(model);
		assertTrue(res.contains("in"));
	}
}
