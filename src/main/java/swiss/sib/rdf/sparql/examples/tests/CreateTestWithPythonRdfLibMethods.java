package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Context.Builder;
import org.graalvm.python.embedding.GraalPyResources;
import org.graalvm.python.embedding.VirtualFileSystem;

import swiss.sib.rdf.sparql.examples.vocabularies.SIB;

public class CreateTestWithPythonRdfLibMethods {

	private CreateTestWithPythonRdfLibMethods() {

	}

	static void testQueryValid(Path p) {
		assertTrue(Files.exists(p));
		RDFParser rdfParser = Rio.createParser(RDFFormat.TURTLE);
		Model model = new LinkedHashModel();
		rdfParser.setRDFHandler(new StatementCollector(model));
		try (InputStream newInputStream = Files.newInputStream(p)) {
			rdfParser.parse(newInputStream);
		} catch (RDFParseException | RDFHandlerException | IOException e) {
			fail(e);
		}
		assertFalse(model.isEmpty());
		try (var context = CONTEXT_BUILDER.build()) {
			Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
					.map(s -> model.getStatements(null, s, null)).map(Iterable::iterator)
					.forEach(i -> testAllQueryStringsInModel(context, i));
		}

	}

	private static void testAllQueryStringsInModel(Context context, Iterator<Statement> i) {
		while (i.hasNext()) {
			Statement next = i.next();
			testQueryStringInValue(context, next);
		}
	}


	private static final VirtualFileSystem VFS = VirtualFileSystem.newBuilder()
			.resourceDirectory("GRAALPY-VFS/swiss.sib.rdf/sparql-examples-utils").build();

	static final Builder CONTEXT_BUILDER = GraalPyResources.contextBuilder(VFS)
			.option("engine.WarnInterpreterOnly", "false")
			.allowAllAccess(true);
	private static final Predicate<String> SERVICE_PATTERN = Pattern.compile("service", Pattern.CASE_INSENSITIVE)
			.asPredicate();

	private static final String PYTHON = "python";
	private static final String TEST_SCRIPT = """
             from rdflib.plugins.sparql.parser import parseQuery
             from rdflib.exceptions import ParserError as ParseError
             def test(query):
                 try:
                     parseQuery(query)
                     return "OK"
                 except ParseError as err:
                     print(err.msg)
                     return err.msg
                 except Exception as e:
                     return str(e)
             test
             """;


	static void testQueryStringInValue(Context context, Statement next) {
		Value obj = next.getObject();
		assertNotNull(obj);
		assertTrue(obj.isLiteral());
		String query = obj.stringValue();
		if (SERVICE_PATTERN.test(query)) {
			return;
		}
		@SuppressWarnings("unchecked")
		Function<String, String> t = context.eval(PYTHON, TEST_SCRIPT).as(Function.class);
		String apply = t.apply(query);
		assertEquals("OK", apply, "Query not valid according to RDFlib: " + query +" Result: " + apply);
	}
}
