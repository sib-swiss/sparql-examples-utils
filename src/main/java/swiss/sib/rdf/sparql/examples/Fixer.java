package swiss.sib.rdf.sparql.examples;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.vocabulary.DCTERMS;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.TupleQuery;
import org.eclipse.rdf4j.query.TupleQueryResult;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.repository.sail.SailRepositoryConnection;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import picocli.CommandLine;
import picocli.CommandLine.Model.CommandSpec;
import picocli.CommandLine.Option;
import picocli.CommandLine.Spec;
import swiss.sib.rdf.sparql.examples.fixes.Blazegraph;
import swiss.sib.rdf.sparql.examples.fixes.Federation;
import swiss.sib.rdf.sparql.examples.fixes.NodeTypes;
import swiss.sib.rdf.sparql.examples.fixes.Prefixes;
import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;

@CommandLine.Command(name = "fix", description = "Attempts to fixes example files")
public class Fixer implements Callable<Integer> {
	private static final Logger log = LoggerFactory.getLogger(Fixer.class);
	private static final ValueFactory VF = SimpleValueFactory.getInstance();

	@Spec
	CommandSpec spec;

	private static final String PREFIXES = "PREFIX sh:<" + SHACL.NAMESPACE + "> PREFIX sib:<" + SIB.NAMESPACE + ">";
	@Option(names = { "-i",
			"--input-directory" }, paramLabel = "directory containing example files to test", description = "The root directory where the examples and their prefixes can be found.", required = true)
	private Path inputDirectory;

	@Option(names = { "-h", "--help" }, usageHelp = true, description = "display this help message")
	private boolean usageHelpRequested;

	public Integer call() {
		CommandLine commandLine = spec.commandLine();
		if (commandLine.isUsageHelpRequested()) {
			commandLine.usage(System.out);
		} else if (commandLine.isVersionHelpRequested()) {
			commandLine.printVersionHelp(System.out);
		} else {
			try {
				findFilesToFix();
			} catch (NeedToStopException e) {
				return e.getFailure().exitCode();
			}
		}
		return 0;
	}

	public record Fixed(boolean changed, String fixed, String original, Set<String> servicePartners) {
		public Fixed(boolean changed, String fixed, String original) {
			this(changed, fixed, original, null);
		}
	}

	private void findFilesToFix() {
		try {
			Map<String, String> prefixes = loadPrefixes();
			try (Stream<Path> sparqlExamples = FindFiles.sparqlExamples(inputDirectory)) {
				sparqlExamples.forEach(ttl -> {
					log.info("Looking at:" + ttl);
					try (FileInputStream in = new FileInputStream(ttl.toFile())) {
						Model model = parseIntoModel(in);
						IRI queryIri = null;
						Value query = null;
						IRI type=null;
						Statement select = has(model, SHACL.SELECT);
						Statement construct = has(model, SHACL.CONSTRUCT);
						Statement ask = has(model, SHACL.ASK);
						Statement describe = has(model, SIB.DESCRIBE);
						if (select != null) {
							queryIri = (IRI) select.getSubject();
							query = select.getObject();
							type=SHACL.SELECT;
						} else if (construct != null) {
							queryIri = (IRI) construct.getSubject();
							query = construct.getObject();
							type=SHACL.CONSTRUCT;
						} else if (ask != null) {
							queryIri = (IRI) ask.getSubject();
							query = ask.getObject();
							type=SHACL.ASK;
						} else if (describe != null) {
							queryIri = (IRI) describe.getSubject();
							query = describe.getObject();
							type=SIB.DESCRIBE;
						}
						if (queryIri != null && query != null) {
							fix(queryIri, query, ttl, model, prefixes, type);
						}
					} catch (IOException | RDFParseException e) {
						log.error("RDF error in " + ttl);
						Failure.CANT_READ_EXAMPLE.tothrow(e);
					}
				});
			}
		} catch (IOException e) {
			Failure.CANT_READ_INPUT_DIRECTORY.tothrow(e);
		}
	}

	public Model parseIntoModel(FileInputStream in) throws IOException {
		Model model = new TreeModel();
		RDFParser rdfParser = Rio.createParser(RDFFormat.TURTLE);
		rdfParser.setRDFHandler(new StatementCollector(model));
		rdfParser.parse(in);
		return model;
	}

	private Statement has(Model model, IRI iri) {
		Iterator<Statement> iterator = model.getStatements(null, iri, null).iterator();
		if (iterator.hasNext()) {
			return iterator.next();
		}
		return null;
	}

	private Map<String, String> loadPrefixes() throws IOException {
		SailRepository sr = new SailRepository(new MemoryStore());
		sr.init();
		try (SailRepositoryConnection conn = sr.getConnection()) {
			FindFiles.prefixFile(inputDirectory).forEach(p -> {
				conn.begin();
				try {
					conn.add(p.toFile());
				} catch (RDFParseException | RepositoryException | IOException e) {
					Failure.CANT_PARSE_PREFIXES.tothrow(e);
				}
				conn.commit();
			});
		}
		Map<String, String> prefixes = new LinkedHashMap<>();
		try (SailRepositoryConnection conn = sr.getConnection()) {
			TupleQuery tq = conn.prepareTupleQuery(PREFIXES + """
						SELECT ?prefix ?namespace {
							[] sh:prefix ?prefix;
							   sh:namespace ?namespace .
						}
					""");
			try (TupleQueryResult tqr = tq.evaluate()) {
				while (tqr.hasNext()) {
					BindingSet tqrb = tqr.next();
					String prefix = tqrb.getValue("prefix").stringValue();
					String namespace = tqrb.getValue("namespace").stringValue();
					prefixes.put(prefix, namespace);
				}
			}
		}
		sr.shutDown();
		return prefixes;
	}

	static void fix(IRI queryIri, Value query, Path file, Model model, Map<String, String> prefixes2, IRI type) {
		String queryIriStr = queryIri.stringValue();

		Fixed fixedPrefixes = fixPrefixes(queryIri, query, file, model, prefixes2, type, queryIriStr);
		Fixed fixBlz = fixBlazeGraph(queryIri, query, file, model, type, queryIriStr, fixedPrefixes);
		if (fixBlz.changed()) {
			fixBlz = fixBlazeGraph(queryIri, query, file, model, type, queryIriStr, fixBlz);
		}
		boolean serviceWithChanged = fixMarkupFederationPartners(queryIri, file, model, queryIriStr, fixBlz);
		Fixed fixedDatatypes = fixDatatypes(queryIri, file, model, type, queryIriStr, fixBlz);
		if (!fixedPrefixes.changed() && !fixBlz.changed() && !serviceWithChanged && !fixedDatatypes.changed()) {
			log.debug("No change to:" + file);
		}
	}

	public static Fixed fixDatatypes(IRI queryIri, Path file, Model model, IRI type, String queryIriStr, Fixed fixBlz) {
		Fixed fixedDatatypes = NodeTypes.fix(fixBlz, queryIriStr);
		if (fixedDatatypes.changed()) {
			log.debug("Fixed datatypes " + queryIriStr + " in file " + file);
			model.remove(queryIri, type, null);
			model.add(queryIri, type, VF.createLiteral(fixedDatatypes.fixed()));
			writeModel(file, model);
		}
		return fixedDatatypes;
	}

	public static Fixed fixBlazeGraph(IRI queryIri, Value query, Path file, Model model, IRI type, String queryIriStr,
			Fixed fixedPrefixes) {
		Fixed fixBlz = Blazegraph.fixBlazeGraph(fixedPrefixes, queryIriStr, file);

		if (fixBlz.changed()) {
			log.debug("Fixed blaze graph " + queryIriStr + " in file " + file);
			model.remove(queryIri, type, null);
			model.remove(queryIri, SIB.BIGDATA_QUERY, null);
			model.add(queryIri, type, VF.createLiteral(fixBlz.fixed()));
			model.add(queryIri, SIB.BIGDATA_QUERY, query);
			writeModel(file, model);
		}
		return fixBlz;
	}

	public static Fixed fixPrefixes(IRI queryIri, Value query, Path file, Model model, Map<String, String> prefixes2,
			IRI type, String queryIriStr) {
		Fixed fixedPrefixes = Prefixes.fixMissingPrefixes(query.stringValue(), prefixes2);
		if (fixedPrefixes.changed()) {
			log.debug("Fixed prefixes " + queryIriStr + " in file " + file);
			model.remove(queryIri, type, null);
			model.add(queryIri, type, VF.createLiteral(fixedPrefixes.fixed()));
			writeModel(file, model);
		}
		return fixedPrefixes;
	}

	public static boolean fixMarkupFederationPartners(IRI queryIri, Path file, Model model, String queryIriStr,
			Fixed fixBlz) {
		Fixed fixFederatedWith = Federation.fix(fixBlz, queryIriStr);
		if (fixFederatedWith.servicePartners() != null && !fixFederatedWith.servicePartners().isEmpty()) {
			Model filter = model.filter(queryIri, SIB.FEDERATES_WITH, null);
			if (filter.size() > fixFederatedWith.servicePartners().size()) {
				model.remove(queryIri, SIB.FEDERATES_WITH, null);
			}
			boolean present = true;
			for (String fedWith : fixFederatedWith.servicePartners()) {
				if (model.add(queryIri, SIB.FEDERATES_WITH, VF.createIRI(fedWith))) {
					present = false;
				}
			}
			if (!present) {
				writeModel(file, model);
				return true;
			}
		}
		return false;
	}

	private static void writeModel(Path file, Model model) {
		try (OutputStream out = Files.newOutputStream(file, StandardOpenOption.TRUNCATE_EXISTING)) {
			model.getNamespaces().add(SHACL.NS);
			model.getNamespaces().add(RDF.NS);
			model.getNamespaces().add(RDFS.NS);
			model.getNamespaces().add(SchemaDotOrg.NS);
			model.getNamespaces().add(DCTERMS.NS);
			model.getNamespaces().add(SIB.NS);
			Rio.write(model, out, RDFFormat.TURTLE);

		} catch (RDFHandlerException | IOException e) {
			Failure.CANT_WRITE_FIXED_EXAMPLE.tothrow(e);
		}
	}
}
