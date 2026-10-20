package swiss.sib.rdf.sparql.examples;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

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

	@Test
	public void filterIn() {
		Model model = parse(filterIn);
		String res = SparqlInRdfToMermaid.asMermaid(model);
		assertTrue(res.contains("in"));
	}
}
