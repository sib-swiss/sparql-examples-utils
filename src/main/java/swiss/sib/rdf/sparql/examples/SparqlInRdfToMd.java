package swiss.sib.rdf.sparql.examples;

import static swiss.sib.rdf.sparql.examples.SparqlInRdfToRq.streamOf;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.DC;
import org.eclipse.rdf4j.model.vocabulary.DCTERMS;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.model.vocabulary.VOID;
import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.algebra.QueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.QueryParser;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParserFactory;
import org.jsoup.Jsoup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import swiss.sib.rdf.sparql.examples.mermaid.SparqlInRdfToMermaid;
import swiss.sib.rdf.sparql.examples.statistics.Counter;
import swiss.sib.rdf.sparql.examples.statistics.ServiceDescription;
import swiss.sib.rdf.sparql.examples.vocabularies.CITO;
import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;

/**
 * Generate markdown from RDF containing SPARQL queries.
 * 
 * Includes index and algebra statistics.
 */
public class SparqlInRdfToMd {

	private SparqlInRdfToMd() {

	}

	private static final Logger log = LoggerFactory.getLogger(SparqlInRdfToMd.class);

	public static List<String> asMD(Model ex) {
		List<String> rq = new ArrayList<>();

		streamOf(ex, null, RDF.TYPE, SHACL.SPARQL_EXECUTABLE).map(Statement::getSubject).distinct().forEach(queryId -> {
			String ln = ((IRI) queryId).getLocalName();
			rq.add("# " + ln + "\n");
			rq.add("");
			streamOf(ex, queryId, DC.CONTRIBUTOR, null).map(Statement::getObject).map(Value::stringValue)
					.map(k -> " * Contributor: " + k).forEach(rq::add);
			rq.add("");
			streamOf(ex, queryId, DCTERMS.LICENSE, null).map(Statement::getObject).map(Value::stringValue)
					.map(k -> " * License: [" + k + "](" + k + ")").forEach(rq::add);
			rq.add("");
			streamOf(ex, queryId, CITO.USES_METHOD_IN, null).map(Statement::getObject).map(Value::stringValue)
					.map(k -> " * Uses method in: [" + k + "](" + k + ")").forEach(rq::add);
			rq.add("");
			streamOf(ex, null, SIB.FILE_NAME, null).map(s -> s.getObject().stringValue())
					.map(s -> s.replaceAll(".ttl", "")).map(s -> "[rq](" + s + ".rq) [turtle/ttl](" + s + ".ttl)")
					.forEach(rq::add);
			rq.add("");
			streamOf(ex, queryId, SchemaDotOrg.KEYWORDS, null).map(Statement::getObject).map(Value::stringValue)
					.map(k -> " * " + k).forEach(rq::add);
			rq.add("");
			streamOf(ex, queryId, RDFS.COMMENT, null).map(Statement::getObject).map(Value::stringValue)
					.forEach(rq::add);

			rq.add("");
			rq.add("## Use at ");
			streamOf(ex, queryId, SchemaDotOrg.TARGET, null).map(Statement::getObject).map(Value::stringValue)
					.map(v -> " * " + v).forEach(rq::add);

			rq.add("");
			rq.add("```sparql");
			Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
					.flatMap(qt -> streamOf(ex, queryId, qt, null)).map(Statement::getObject).map(Value::stringValue)
					.forEach(rq::add);
			rq.add("```");
			Iterator<Statement> iterator = streamOf(ex, queryId, DCTERMS.IS_PART_OF, null).iterator();
			if (iterator.hasNext()) {
				rq.add("## Query found at ");
				while (iterator.hasNext()) {
					String obj = iterator.next().getObject().stringValue();
					rq.add(" * [" + obj + "](" + obj + ")");
				}
			}

		});
		rq.add("");
		try {
			String asMermaid = SparqlInRdfToMermaid.asMermaid(ex);
			rq.add("```mermaid");
			rq.add(asMermaid);
			rq.add("```");
		} catch (MalformedQueryException | IllegalArgumentException e) {
			log.debug("Could not convert to mermaid", e);
		}
		return rq;
	}

	public static List<String> asIndexMD(Model ex) {
		List<String> rq = new ArrayList<>();
		streamOf(ex, null, SIB.PROJECT, null).map(Statement::getObject).distinct()
				.forEach(o -> rq.add("# " + o.stringValue()));
		rq.add("");

		var subs = streamOf(ex, null, SIB.SUB_PROJECT, null).map(Statement::getObject).distinct().toList();
		if (!subs.isEmpty()) {
			rq.add("## More examples");
			rq.add("");
			subs.forEach(o -> rq.add("[" + o.stringValue() + "](./" + o.stringValue() + "/)"));
			rq.add("");
		}

		rq.add("## Examples");
		streamOf(ex, null, SIB.FILE_NAME, null).flatMap(s -> streamOf(ex, s.getSubject(), RDFS.COMMENT, null)
				.map(Statement::getObject).map(asNiceLink(s.getObject().stringValue(), ".md"))).sorted()
				.forEach(rq::add);
		return rq;
	}

	public static List<String> asStatisticsMD(Model ex) {
		List<String> rq = new ArrayList<>();

		Counter counter = new Counter();
		streamOf(ex, null, RDF.TYPE, SHACL.SPARQL_EXECUTABLE).map(Statement::getSubject).distinct()
				.forEach(queryId -> Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
						.flatMap(qt -> streamOf(ex, queryId, qt, null))
						.forEach(q -> countInEachQuery(ex, counter, queryId, q)));
		rq.add("# Statistics for SPARQL algebra features in use");
		rq.add("");
		rq.add("""
				Some basic statisics on SPARQL algebra features, as determined after parsing with RDF4j.
				""");
		NumberFormat f = NumberFormat.getNumberInstance();
		f.setMaximumFractionDigits(2);
		rq.add("Statitics are collected over " + counter.getQueries() + " queries. Using "
				+ avg(f, counter.getBasicPatterns().perFeature(), counter.getQueries())
				+ " statement patterns per query.");
		rq.add("");

		rq.add("| Type | Count | Queries |");
		rq.add("|------|-------|-----|");
		add(rq, "Statement patterns", counter.getBasicPatterns());
		add(rq, "Filter", counter.getFilters());
		add(rq, "Optional", counter.getOptionals());
		add(rq, "Property path", counter.getPropertyPaths());
		add(rq, "Service", counter.getServiceClauses());
		add(rq, "Union", counter.getUnions());
		add(rq, "Minus", counter.getMinus());
		add(rq, "Exists", counter.getExists());
		add(rq, "Group", counter.getGroups());
		add(rq, "Order", counter.getOrder());
		add(rq, "Aggregate", counter.getAggregates());
		add(rq, " - Average", counter.getAverages());
		add(rq, " - Count", counter.getCount());
		add(rq, " - GroupConcat", counter.getGroupConcat());
		add(rq, " - Max", counter.getMaxs());
		add(rq, " - Min", counter.getMins());
		add(rq, " - Sample", counter.getSample());
		add(rq, " - Sum", counter.getSums());
		rq.add("");
		rq.add("""
				Note describe queries may have zero statement patterns.

				# Statistics for SPARQL variables and constants

				This is distinct constants and variables. Two uses of the same IRI predicate in multiple triple patterns count as one constant.
				""");
		rq.add("");
		rq.add("|  | Count | Avg |");
		rq.add("|------|-------|-----|");
		rq.add("| Variables | " + counter.getVariables() + " | " + avg(f, counter.getVariables(), counter.getQueries())
				+ " |");
		rq.add("| Constants | " + counter.getConstants() + " | " + avg(f, counter.getConstants(), counter.getQueries())
				+ " |");
		rq.add("");
		return rq;
	}

	private record InUse(Set<IRI> predicates, Set<IRI> classes) {

	};

	public static List<String> asSchemaMD(Model ex) {
		List<String> rq = new ArrayList<>();

		Iterator<IRI> endpoints = endPoints(ex);
		Map<IRI, Model> allVoid = new HashMap<>();
		Map<IRI, InUse> allInUse = new HashMap<>();
		addServiceDescriptionToAnalyzerQueue(endpoints, allVoid, allInUse);

		streamOf(ex, null, RDF.TYPE, SHACL.SPARQL_EXECUTABLE).map(Statement::getSubject).distinct()
				.forEach(queryId -> Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
						.flatMap(qt -> streamOf(ex, queryId, qt, null))
						.forEach(q -> inUseEachQuery(ex, allInUse, queryId, q, allVoid)));
		rq.add("# Statistics for coverage of the KG data model using VoID");
		rq.add("");
		rq.add("""
				Some basic statisics on coverage of the KG using VoID statistics in the endpoints ServiceDescription.
				""");
		rq.add("");
		endpoints = endPoints(ex);
		rq.add("|  | classes  | predicates |");
		while (endpoints.hasNext()) {
			IRI endpoint = endpoints.next();
			InUse inUse = allInUse.get(endpoint);
			if (inUse != null) {
			    rq.add("| " + endpoint + " | " + inUse.classes().size() + " | " + inUse.predicates().size() + " |");
			} else {
				rq.add("| " + endpoint + " | - | - |");
			}
			Model sd = allVoid.get(endpoint);
			if (sd != null) {
			    rq.add("| void | " + streamOf(sd, null, VOID.CLASS, null).count() + " | "
					+ streamOf(sd, null, VOID.PROPERTY, null).count() + " |");
			} else {
				rq.add("| void | - | - |");
			}
		}
		return rq;
	}

	private static void addServiceDescriptionToAnalyzerQueue(Iterator<IRI> endpoints, Map<IRI, Model> allVoid,
			Map<IRI, InUse> allInUse) {
		while (endpoints.hasNext()) {
			IRI endpoint = endpoints.next();
			
			var vd = ServiceDescription.retrieveVoIDDataFromServiceDescription(endpoint.stringValue());
			if (!vd.isEmpty()) {
				allVoid.put(endpoint, vd);
				allInUse.put(endpoint, new InUse(new HashSet<>(), new HashSet<>()));
			}
		}
	}

	private static Iterator<IRI> endPoints(Model ex) {
		return streamOf(ex, null, SchemaDotOrg.TARGET, null).map(Statement::getObject)
				.map(IRI.class::cast).distinct().iterator();
	}

	private static void inUseEachQuery(Model ex, Map<IRI, InUse> allInUse, Resource queryId, Statement q,
			Map<IRI, Model> allVoid) {
		var hasTargets = ex.getStatements(queryId, SchemaDotOrg.TARGET, null);
		for (Statement st : hasTargets) {
			var obj = st.getObject();
			if (allVoid.containsKey(obj)) {
				var voidData = allVoid.get(obj);
				var inUse = allInUse.get(obj);
				QueryParser parser = new SPARQLParserFactory().getParser();
				String query = q.getObject().stringValue();

				ParsedQuery pq = parser.parseQuery(query, obj.stringValue());
				QueryModelVisitor<RuntimeException> qmv = new AbstractQueryModelVisitor<RuntimeException>() {

					@Override
					public void meet(Service node) throws RuntimeException {
						// Do not investigate services
					}

					@Override
					public void meet(StatementPattern node) throws RuntimeException {
						var p = node.getPredicateVar();
						var o = node.getObjectVar();
						if (p.isConstant() && p.getValue() instanceof IRI pi) {
							if (RDF.TYPE.equals(pi) && o.getValue() instanceof IRI oi) {
								if (voidData.contains(null, VOID.CLASS, oi)) {
									inUse.classes().add(oi);
								}
							} else if (voidData.contains(null, VOID.PROPERTY, pi)) {
								inUse.predicates().add(pi);
							}
						}
					}

				};
				pq.getTupleExpr().visit(qmv);

			}
		}
	}

	private static void countInEachQuery(Model ex, Counter counter, Resource queryId, Statement q) {
		String base = streamOf(ex, q.getSubject(), SchemaDotOrg.TARGET, null).map(Statement::getObject)
				.filter(Value::isIRI).map(Value::stringValue).findFirst().orElse("https://example.org/");
		QueryParser parser = new SPARQLParserFactory().getParser();
		String query = q.getObject().stringValue();

		ParsedQuery pq = parser.parseQuery(query, base);
		TupleExpr tq = pq.getTupleExpr();
		counter.count(tq, queryId);
	}

	private static String avg(NumberFormat f, int perFeature, int queries) {
		return f.format((float) perFeature / (float) queries);
	}

	private static void add(List<String> rq, String string, Counter.CountResult c) {
		rq.add("| " + string + " | " + c.perFeature() + " | " + c.perQuery() + " |");
	}

	private static Function<Value, String> asNiceLink(String fileName, String extension) {
		return v -> {
			String comment = Jsoup.parse(v.stringValue()).text().replace("[", " ").replace("]", " ").strip();
			if (comment.length() > 75) {
				comment = comment.substring(0, 75) + "...";
			}
			String fileNameOfMdFile = fileName.substring(0, fileName.length() - 4) + extension;
			if (v instanceof Literal l && l.getLanguage().isPresent()) {
				// Escape "@" symbol in the link text
				return " - [" + comment.replace("@", "\\@") + "@" + l.getLanguage().get().replace("@", "\\@") + "](./"
						+ fileNameOfMdFile + ")";
			} else {
				// Escape "@" symbol in the link text
				return " - [" + comment.replace("@", "\\@") + "](./" + fileNameOfMdFile + ")";
			}
		};
	}
}
