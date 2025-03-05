package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.query.BooleanQuery;
import org.eclipse.rdf4j.query.GraphQuery;
import org.eclipse.rdf4j.query.GraphQueryResult;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.Query;
import org.eclipse.rdf4j.query.QueryEvaluationException;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.Slice;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.QueryParser;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParserFactory;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Context.Builder;

import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.io.IOAccess;

public class CreateTestWithPythonRdfLibMethods {

	private enum QueryTypes {
		ASK(SHACL.ASK, (rc, q) -> rc.prepareBooleanQuery(q)), SELECT(SHACL.SELECT, (rc, q) -> rc.prepareTupleQuery(q)),
		DESCRIBE(SIB.DESCRIBE, (rc, q) -> rc.prepareGraphQuery(q)),
		CONSTRUCT(SHACL.CONSTRUCT, (rc, q) -> rc.prepareGraphQuery(q));

		private final IRI iri;
		private final BiFunction<RepositoryConnection, String, ? extends Query> pq;

		QueryTypes(IRI iri, BiFunction<RepositoryConnection, String, ? extends Query> pq) {
			this.iri = iri;
			this.pq = pq;
		}
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

	private static final Source PYTHON_SOURCE = Source.newBuilder("python", """
			from rdflib.plugins.sparql import prepareQuery
			try:
				q = prepareQuery(
				    query
				)
				return true
			except:
				return false
			""", "rdflib-test.py").buildLiteral();

	private static final Builder CONTEXT_BUILDER = Context.newBuilder().option("engine.WarnInterpreterOnly", "false")
			.allowIO(IOAccess.NONE).allowCreateThread(true).allowNativeAccess(true);
	private static final Predicate<String> SERVICE_PATTERN = Pattern.compile("service", Pattern.CASE_INSENSITIVE)
			.asPredicate();

	private static void testQueryStringInValue(Context context, Statement next) {
		Value obj = next.getObject();
		assertNotNull(obj);
		assertTrue(obj.isLiteral());
		String query = obj.stringValue();
		if (SERVICE_PATTERN.test(query)) {
			return;
		}
		context.getBindings("python").putMember("query", next.getObject().stringValue());
		assertTrue(context.eval(PYTHON_SOURCE).asBoolean());
	}
}
