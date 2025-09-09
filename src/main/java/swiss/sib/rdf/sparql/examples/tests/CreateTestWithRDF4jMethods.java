package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpClient.Builder;
import java.net.http.HttpClient.Redirect;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandler;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiFunction;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.model.vocabulary.VOID;
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
import org.eclipse.rdf4j.query.algebra.StatementPattern;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;

public class CreateTestWithRDF4jMethods {
	private static final Logger logger = LoggerFactory.getLogger(CreateTestWithRDF4jMethods.class);

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
		QueryParser parser = new SPARQLParserFactory().getParser();
		Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE).map(s -> model.getStatements(null, s, null))
				.map(Iterable::iterator).forEach(i -> testAllQueryStringsInModel(parser, i));

	}

	static Stream<String> extractServiceEndpoints(Path p) {
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
		QueryParser parser = new SPARQLParserFactory().getParser();

		return Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
				.map(s -> model.getStatements(null, s, null)).map(Iterable::iterator).map(i -> {
					return collectServiceIrisInFromOneExample(parser, i);
				}).flatMap(Set::stream);
	}

	private static Set<String> collectServiceIrisInFromOneExample(QueryParser parser, Iterator<Statement> i) {
		Set<String> serviceIris = new HashSet<>();
		while (i.hasNext()) {
			Value obj = i.next().getObject();

			extractedServiceIRIsFromOneQuery(parser, serviceIris, obj.stringValue());
		}
		return serviceIris;
	}

	public static void extractedServiceIRIsFromOneQuery(QueryParser parser, Set<String> serviceIris, String obj) {
		try {
			ParsedQuery query = parser.parseQuery(obj, "https://example.org/");
			query.getTupleExpr().visit(new AbstractQueryModelVisitor<RuntimeException>() {

				@Override
				public void meet(Service node) throws RuntimeException {
					Value value = node.getServiceRef().getValue();
					if (value != null) {
						serviceIris.add(value.stringValue());
					}
					super.meet(node);
				}

			});
		} catch (MalformedQueryException qe) {
			// Ignore as tested by above;
		}
	}

	private static void testAllQueryStringsInModel(QueryParser parser, Iterator<Statement> i) {
		while (i.hasNext()) {
			Statement next = i.next();
			testQueryStringInValue(parser, next);
		}
	}

	private static void testQueryStringInValue(QueryParser parser, Statement next) {
		Value obj = next.getObject();
		assertNotNull(obj);
		assertTrue(obj.isLiteral());

		try {
			parser.parseQuery(obj.stringValue(), "https://example.org/");
		} catch (MalformedQueryException qe) {
			fail(qe.getMessage() + "\n" + obj.stringValue(), qe);
		}
	}

	/**
	 * Generate a test case to make sure the query runs.
	 * 
	 * @param p of file containing the query
	 */
	public static void testQueryRuns(Path p) {
		Model model = readAllQueries(p);
		QueryParser parser = new SPARQLParserFactory().getParser();
		Arrays.stream(QueryTypes.values()).forEach(s -> executeAllQueryStringsInModel(parser, model, s));
	}

	/**
	 * Generate a test case to make sure the query runs.
	 * 
	 * @param p of file containing the query
	 */
	private static final Map<String, Model> VOID_DATA_CACHE = new ConcurrentHashMap<>();

	public static void testQueryMatchesVoid(Path p) {
		Model model = readAllQueries(p);
		QueryParser parser = new SPARQLParserFactory().getParser();
		Arrays.stream(QueryTypes.values())
				.forEach(s -> validateWithVoidAllQueryStringsInModel(parser, model, s, VOID_DATA_CACHE));
	}

	private static Model readAllQueries(Path p) {
		RDFParser rdfParser = Rio.createParser(RDFFormat.TURTLE);
		Model model = new LinkedHashModel();
		rdfParser.setRDFHandler(new StatementCollector(model));
		try (InputStream newInputStream = Files.newInputStream(p)) {
			rdfParser.parse(newInputStream);
		} catch (RDFParseException | RDFHandlerException | IOException e) {
			fail(e);
		}
		assertFalse(model.isEmpty());
		return model;
	}

	private static void validateWithVoidAllQueryStringsInModel(QueryParser parser, Model m, QueryTypes qt,
			Map<String, Model> voidDataCache) {
		Iterator<Statement> i = m.getStatements(null, qt.iri, null).iterator();

		while (i.hasNext()) {
			Statement next = i.next();
			Iterator<Statement> targets = m.getStatements(next.getSubject(), SchemaDotOrg.TARGET, null).iterator();
			while (targets.hasNext()) {
				Statement targetStatement = targets.next();
				voidValidateQueryStringInValue(parser, next.getObject(), targetStatement.getObject(), qt,
						voidDataCache);
			}
		}
	}

	private static void executeAllQueryStringsInModel(QueryParser parser, Model m, QueryTypes qt) {
		Iterator<Statement> i = m.getStatements(null, qt.iri, null).iterator();
		while (i.hasNext()) {
			Statement next = i.next();
			Iterator<Statement> targets = m.getStatements(next.getSubject(), SchemaDotOrg.TARGET, null).iterator();
			while (targets.hasNext()) {
				Statement targetStatement = targets.next();
				executeQueryStringInValue(parser, next.getObject(), targetStatement.getObject(), qt);
			}
		}
	}

	private static void voidValidateQueryStringInValue(QueryParser parser, Value obj, Value target, QueryTypes qt,
			Map<String, Model> voidDataCache) {
		assertNotNull(obj);
		assertTrue(obj.isLiteral());
		String queryStr = obj.stringValue();
		String endpoint = target.stringValue();
		Model voidData = voidDataCache.get(endpoint);
		if (voidData == null) {
			voidData = retrieveVoidDataFromServiceDescription(endpoint);
			voidDataCache.put(endpoint, voidData);
		}
		if (!voidData.isEmpty()) {
			testVoidProperties(parser, queryStr, endpoint, voidData);
		}
	}

	private static void testVoidProperties(QueryParser parser, String queryStr, String endpoint, Model voidData) {
		try {
			ParsedQuery pq = parser.parseQuery(queryStr, endpoint);
			var vis = new AbstractQueryModelVisitor<MalformedQueryException>() {

				@Override
				public void meet(Service node) throws MalformedQueryException {
					// Do not descend into Service nodes.
				}

				@Override
				public void meet(StatementPattern node) throws MalformedQueryException {
					var p = node.getPredicateVar();
					var o = node.getObjectVar();
					if (p.isConstant() && p.getValue() instanceof IRI pi) {
						if (RDF.TYPE.equals(pi) && o.getValue() instanceof IRI oi) {
							assertTrue(voidData.contains(null, VOID.CLASS, oi), "Missing class: " + oi + " in "+ endpoint);
						} else {
							assertTrue(voidData.contains(null, VOID.PROPERTY, pi), "Missing property: " + pi + " in "+ endpoint);
						}
					}
				}

			};
			pq.getTupleExpr().visit(vis);
		} catch (MalformedQueryException qe) {
			fail(qe.getMessage() + "\n" + queryStr, qe);
		} catch (QueryEvaluationException qe) {
			fail(qe.getMessage() + "\n" + queryStr, qe);
		}
	}

	private static Model retrieveVoidDataFromServiceDescription(String endpoint) {
		Builder hcb = HttpClient.newBuilder();
		hcb.followRedirects(Redirect.ALWAYS);

		try (HttpClient cl = hcb.build()) {
			try {
				var accept = Stream.of(RDFFormat.TURTLE, RDFFormat.RDFXML).map(RDFFormat::getDefaultMIMEType)
						.collect(Collectors.joining(", "));
				HttpRequest hr = HttpRequest.newBuilder(new URI(endpoint))
						.setHeader("user-agent", "sparql-examples-utils-check-void").setHeader("accept", accept)
						.build();
				BodyHandler<byte[]> buffering = BodyHandlers.buffering(BodyHandlers.ofByteArray(), 1024);
				HttpResponse<byte[]> send = cl.send(hr, buffering);
				if (send.statusCode() == 200) {
					List<String> contentTypes = send.headers().allValues("content-type");
					for (String ct : contentTypes) {
						var p = Rio.getParserFormatForMIMEType(ct);
						if (p.isPresent()) {
							RDFFormat format = p.get();
							Model model = Rio.parse(new ByteArrayInputStream(send.body()), format,
									SimpleValueFactory.getInstance().createIRI(endpoint));
							logger.info("VoID data for : {} triples: {}", endpoint, model.size());
							return model;
						}
					}
				}
			} catch (IOException | URISyntaxException e) {
				fail(e.getMessage());

			} catch (InterruptedException e) {
				fail(e.getMessage());
				Thread.interrupted();
			} catch (RDFHandlerException e) {
				// Ignore
			}
		}
		return new TreeModel();
	}

	private static void executeQueryStringInValue(QueryParser parser, Value obj, Value target, QueryTypes qt) {
		assertNotNull(obj);
		assertTrue(obj.isLiteral());
		String queryStr = obj.stringValue();

		SPARQLRepository r = new SPARQLRepository(target.stringValue());
		try {
			r.init();
			try (RepositoryConnection connection = r.getConnection()) {
				queryStr = addLimitToQuery(parser, obj, qt, queryStr);
				Query query = qt.pq.apply(connection, queryStr);
				query.setMaxExecutionTime(45 * 60);
				tryEvaluating(query);
			}
		} catch (MalformedQueryException qe) {
			fail(qe.getMessage() + "\n" + queryStr, qe);
		} catch (QueryEvaluationException qe) {
			fail(qe.getMessage() + "\n" + queryStr, qe);
		}
	}

	private static void tryEvaluating(Query query) throws QueryEvaluationException {
		if (query instanceof BooleanQuery bq) {
			bq.evaluate();
		}
		if (query instanceof TupleQuery tq) {
			try (TupleQueryResult evaluate = tq.evaluate()) {
				assertTrue(evaluate.hasNext(), "Expected at least one result but got none.");
				if (evaluate.hasNext()) {
					evaluate.next();
				}
			}
		}
		if (query instanceof GraphQuery gq) {
			try (GraphQueryResult evaluate = gq.evaluate()) {
				assertTrue(evaluate.hasNext(), "Expected at least one result but got none.");
				if (evaluate.hasNext()) {
					evaluate.next();
				}
			}
		}
	}

	private static String addLimitToQuery(QueryParser parser, Value obj, QueryTypes qt, String queryStr) {
		// If it is not an ask we better insert a limit into the query.
		if (qt != QueryTypes.ASK) {
			HasLimit visitor = new HasLimit();
			ParsedQuery pq = parser.parseQuery(queryStr, "https://example.org/");
			pq.getTupleExpr().visit(visitor);
			if (!visitor.hasLimit) {
				// We can add the limit at the end.
				queryStr = obj.stringValue() + " LIMIT 1";
			}
		}
		return queryStr;
	}

	private static class HasLimit extends AbstractQueryModelVisitor<RuntimeException> {
		private boolean hasLimit = false;

		@Override
		public void meet(Slice node) throws RuntimeException {
			if (node.hasLimit()) {
				hasLimit = true;
			}
		}

	}

	static void testQueryAnnotatedWithFederatesWith(Path p) {
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
		Set<String> serviceEndpoints = extractServiceEndpoints(model).collect(Collectors.toSet());

		serviceEndpoints.forEach(endpoint -> {
			boolean test = model.contains(null, SIB.FEDERATES_WITH,
					SimpleValueFactory.getInstance().createIRI(endpoint));
			assertTrue(test, p + " expected to be annotated with spex:federatesWith <" + endpoint + ">");
		});
		Iterator<Statement> iterator = model.getStatements(null, SIB.FEDERATES_WITH, null).iterator();
		while (iterator.hasNext()) {
			String expectedEndpoint = iterator.next().getObject().stringValue();
			assertTrue(serviceEndpoints.contains(expectedEndpoint),
					p + " annotated with sparql-examples:federates_with <" + expectedEndpoint + "> not in query");
		}

	}

	public static Stream<String> extractServiceEndpoints(Model model) {
		QueryParser parser = new SPARQLParserFactory().getParser();

		return Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
				.map(s -> model.getStatements(null, s, null)).map(Iterable::iterator).map(i -> {
					return collectServiceIrisInFromOneExample(parser, i);
				}).flatMap(Set::stream);
	}
}
