package swiss.sib.rdf.sparql.examples;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ImportFromRqTest {
	private static final String BASE = "http://purl.uniprot.org/uniprot/";
	@TempDir
	Path tempDir;

	@Test
	void prefixConvertsOnceInQuery() throws IOException {
		String q = """
				PREFIX up: <http://purl.uniprot.org/core/>
				SELECT ?taxon
				FROM <http://sparql.uniprot.org/taxonomy>
				WHERE
				{
				    ?taxon a up:Taxon .
				}""";
		Path qf = tempDir.resolve("test.rq");
		Files.writeString(qf, q);
		ImportFromRq importFromRq = new ImportFromRq();
		importFromRq.setInputDirectory(tempDir);
		importFromRq.setBase(BASE);
		importFromRq.findFilesToImport();
		Path testTtl = tempDir.resolve("test.ttl");
		assertTrue(Files.exists(testTtl));
		String ttl = Files.readString(testTtl);
		assertFalse(ttl.isEmpty());
		Model m = new TreeModel();
		Converter.parseTurtleFileIntoModel(m, testTtl);
		assertFalse(m.isEmpty());
		Iterator<Statement> iter = m.getStatements(null, SHACL.SELECT, null).iterator();
		assertTrue(iter.hasNext());
		Statement next = iter.next();
		assertNotNull(next);
		SPARQLParser parser = new SPARQLParser();
		String query = next.getObject().stringValue();
		parser.parseQuery(query, BASE);
		
		Matcher matcher = Pattern.compile("http://purl.uniprot.org/core/", Pattern.LITERAL).matcher(query);
		assertTrue(matcher.find());
		assertFalse(matcher.find());
		assertFalse(iter.hasNext());

	}

}
