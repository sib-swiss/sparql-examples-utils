package swiss.sib.rdf.sparql.examples;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.concurrent.Callable;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.vocabulary.DCTERMS;
import org.eclipse.rdf4j.model.vocabulary.OWL;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.model.vocabulary.XSD;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.Rio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import picocli.CommandLine;
import picocli.CommandLine.Model.CommandSpec;
import picocli.CommandLine.Option;
import picocli.CommandLine.Spec;
import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;

@CommandLine.Command(name = "import-rq", description = "Attempts to import *.rq files")
public class ImportFromRq implements Callable<Integer> {
	private static final Logger log = LoggerFactory.getLogger(ImportFromRq.class);
	private static final ValueFactory VF = SimpleValueFactory.getInstance();
	private final WarningTracker prefixConflictTracker = new WarningTracker();

	private static class WarningTracker {
		private final Map<String, String> messages = new LinkedHashMap<>();
		private final Map<String, Set<String>> files = new LinkedHashMap<>();

		void clear() {
			messages.clear();
			files.clear();
		}

		boolean isEmpty() {
			return messages.isEmpty();
		}

		void add(String key, String message, String source) {
			messages.putIfAbsent(key, message);
			files.computeIfAbsent(key, k -> new TreeSet<>()).add(source);
		}

		void logAll(Logger log) {
			messages.forEach((k, m) -> {
				Set<String> fs = files.get(k);
				if (fs == null || fs.isEmpty()) {
					log.warn(m);
				} else {
					log.warn("{} in {}", m, String.join(", ", fs));
				}
			});
		}
	}

	@Spec
	CommandSpec spec;

	@Option(names = { "-i",
			"--input-directory" }, paramLabel = "directory containing example files to import", description = "The root directory where the examples and their prefixes can be found.", required = true)
	private Path inputDirectory;

	@Option(names = { "-b",
			"--base" }, required = true, description = "The base URI for the examples. e.g. https://purl.example.org/.well-known/sparql-examples#")
	private String base;

	@Option(names = { "-o",
			"--output-directory" }, description = "Optional output directory for .ttl files. Subdirectory structure relative to the input directory is preserved. Defaults to writing each .ttl next to its .rq file.")
	private Path outputDirectory;

	@Option(names = { "-e",
			"--endpoint" }, description = "Only import .rq files whose endpoint matches this URL (from #+ endpoint: comment or endpoint.txt).")
	private String endpointFilter;

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
				findFilesToImport();
			} catch (IOException e) {
				log.error("Can't read input directory", e);
				return Failure.CANT_READ_INPUT_DIRECTORY.exitCode();
			} catch (NeedToStopException e) {
				log.error("{}", e.getMessage());
				return e.getFailure().exitCode();
			}
		}
		return 0;
	}

	void findFilesToImport() throws IOException {
		prefixConflictTracker.clear();
		Map<String, String> prefixes = new TreeMap<>();
		Map<Path, String> endpointCache = new HashMap<>();
		List<Path> iter = Files.walk(inputDirectory).filter(p -> p.toUri().getPath().endsWith(".rq"))
				.collect(Collectors.toList());
		iter.sort((a, b) -> a.toUri().compareTo(b.toUri()));
		// First pass: collect all prefixes so extractServices has the complete set.
		for (Path p : iter) {
			try {
				Files.readAllLines(p).forEach(line -> extractPrefixes(prefixes, line.trim(), p));
			} catch (IOException e) {
				log.warn("Could not pre-scan prefixes in {} ({})", p, e.getMessage());
			}
		}
		int index = 1;
		for (Path p : iter) {
			importFile(p, prefixes, index++, endpointCache);
		}
		log.info("Found prefixes: {}", prefixes.size());
		if (!prefixConflictTracker.isEmpty()) {
			prefixConflictTracker.logAll(log);
		}

		Model prefixModel = new TreeModel();
		prefixModel.setNamespace(SHACL.NS);
		prefixModel.setNamespace(XSD.NS);
		prefixModel.setNamespace(OWL.NS);
		prefixModel.setNamespace(RDF.NS);
		prefixes.entrySet().stream().forEach(e -> {
			BNode pb = VF.createBNode("prefix_" + e.getKey());
			prefixModel.add(VF.createStatement(PREFIXES_BNODE, SHACL.DECLARE, pb));
			prefixModel.add(VF.createStatement(pb, SHACL.PREFIX_PROP, VF.createLiteral(e.getKey())));
			prefixModel.add(VF.createStatement(pb, SHACL.NAMESPACE_PROP, VF.createLiteral(e.getValue(), XSD.ANYURI)));
		});
		prefixModel.add(VF.createStatement(PREFIXES_BNODE, RDF.TYPE, OWL.ONTOLOGY));
		prefixModel.add(VF.createStatement(PREFIXES_BNODE, OWL.IMPORTS, VF.createIRI(SHACL.NAMESPACE)));
		if (outputDirectory != null) {
			try {
				Files.createDirectories(outputDirectory);
			} catch (IOException e) {
				throw Failure.CANT_WRITE_EXAMPLE_RQ.tothrow(e);
			}
			writeModel(outputDirectory.resolve("prefixes.ttl"), prefixModel);
		} else {
			writeModel(inputDirectory.resolve("prefixes.ttl"), prefixModel);
		}
	}

	private static final Pattern PREFIX_PATTERN = Pattern.compile("[pP][rR][eE][fF][iI][xX]\\s+(\\w*):\\s*<([^>]+)>");
	private static final Pattern LEADING_HASH_PLUS_PATTERN = Pattern.compile("^(#+)\\+\\s*([^:]+):(.+)?");
	private static final Pattern LEADING_HASH_PATTERN = Pattern.compile("^(#+)");
	private static final Pattern LEADING_HASH_PLUS_DASH_PATTERN = Pattern.compile("^#\\+\\s*-\\s*(.+)");
	private static final Pattern SELECT = Pattern.compile("SELECT", Pattern.CASE_INSENSITIVE);
	private static final Pattern ASK = Pattern.compile("ASK", Pattern.CASE_INSENSITIVE);
	private static final Pattern CONSTRUCT = Pattern.compile("CONSTRUCT", Pattern.CASE_INSENSITIVE);
	private static final Pattern DESCRIBE = Pattern.compile("DESCRIBE", Pattern.CASE_INSENSITIVE);
	private static final BNode PREFIXES_BNODE = VF.createBNode("sparql_examples_prefixes");

	private void importFile(Path path, Map<String, String> prefixes, int count, Map<Path, String> endpointCache) {
		try {
			Model model = new TreeModel();
			IRI predicate = null;
			Map<String, String> localPrefixes = new TreeMap<>();
			List<String> lines = Files.readAllLines(path);
			List<String> topComments = new ArrayList<>();
			List<String> query = new ArrayList<>();
			boolean queryStarted = false;
			boolean tags = false;
			boolean hasEndpoint = false;
			String fn = path.getFileName().toString();
			model.setNamespace("ex", this.base);
			IRI ex = VF.createIRI(this.base + count + "_" + fn.substring(0, fn.lastIndexOf(".")));
			model.add(VF.createStatement(ex, RDF.TYPE, SHACL.SPARQL_EXECUTABLE));
			model.add(VF.createStatement(ex, SHACL.PREFIXES, PREFIXES_BNODE));
			for (String line : lines) {
				String l = line.trim();
				queryStarted = extractPrefixes(localPrefixes, l, path);

				if (!queryStarted && predicate == null) {
					Matcher hmp = LEADING_HASH_PLUS_PATTERN.matcher(l);
					Matcher hmd = LEADING_HASH_PLUS_DASH_PATTERN.matcher(l);
					Matcher hm = LEADING_HASH_PATTERN.matcher(l);
					if (hmp.find()) {
						boolean wasEndpoint = "endpoint".equals(hmp.group(2).trim());
						tags = garlicMain(model, tags, ex, hmp);
						if (wasEndpoint) hasEndpoint = true;
					} else if (hmd.find()) {
						if (tags) {
							model.add(VF.createStatement(ex, SchemaDotOrg.KEYWORDS, VF.createLiteral(hmd.group(1))));
						}
					} else if (hm.find()) {
						topComments.add(l.substring(hm.group(1).length()));
					} else {
						predicate = tryToStartQuery(predicate, query, l);
						if (predicate != null) {
							queryStarted = true;
						}
					}
				} else {
					// We want to keep indentations from this point on.
					query.add(line);
				}
			}

			if (!hasEndpoint) {
				String url = readEndpointTxt(path.getParent(), endpointCache);
				if (url != null) {
					model.add(VF.createStatement(ex, SchemaDotOrg.TARGET, VF.createIRI(url)));
				}
			}

			if (endpointFilter != null) {
				boolean matches = StreamSupport.stream(model.getStatements(ex, SchemaDotOrg.TARGET, null).spliterator(), false)
						.anyMatch(s -> endpointFilter.equals(s.getObject().stringValue()));
				if (!matches) {
					log.debug("Skipping {} — does not target endpoint {}", path, endpointFilter);
					return;
				}
			}

			if (predicate != null) {
				model.add(VF.createStatement(ex, RDF.TYPE, queryTypeClass(predicate)));
			}
			if (!topComments.isEmpty()) {
				model.add(VF.createStatement(ex, RDFS.COMMENT, VF.createLiteral(String.join("\n", topComments))));
			}
			if (!query.isEmpty()) {
					String q = String.join("\n", query);
					model.add(VF.createStatement(ex, predicate, VF.createLiteral(q)));
					for (String svcUrl : extractServices(q, prefixes, path)) {
							model.add(VF.createStatement(ex, SIB.FEDERATES_WITH, VF.createIRI(svcUrl)));
					}
			}

			Path out;
			if (outputDirectory != null) {
				Path relative = inputDirectory.relativize(path);
				String ttlName = relative.getFileName().toString().replace(".rq", ".ttl");
				Path outDir = outputDirectory.resolve(relative).getParent();
				if (outDir != null) {
					Files.createDirectories(outDir);
				}
				out = (outDir != null ? outDir : outputDirectory).resolve(ttlName);
			} else {
				out = path.getParent().resolve(fn.replace(".rq", ".ttl"));
			}
			writeModel(out, model);
			prefixes.putAll(localPrefixes);
		} catch (IOException e) {
			throw Failure.CANT_PARSE_EXAMPLE.tothrow(e);
		}
	}

	public boolean extractPrefixes(Map<String, String> prefixes, String l, Path source) {
		Matcher pm = PREFIX_PATTERN.matcher(l.trim());
		boolean queryStarted = false;
		while (pm.find()) {
			String prefix = pm.group(1);
			String ns = pm.group(2);
			if (prefix == null) continue;
			queryStarted = true;
			if (prefix.isBlank()) continue;
			if (prefixes.containsKey(prefix) && !prefixes.get(prefix).equals(ns)) {
				String message = String.format("Conflicting prefix `%s`: existing namespace <%s> overridden by <%s>",
						prefix, prefixes.get(prefix), ns);
				String conflictKey = "prefix:" + prefix + ":" + ns;
				prefixConflictTracker.add(conflictKey, message, source.toString());
			}
			for (Map.Entry<String, String> e : prefixes.entrySet()) {
				if (e.getValue().equals(ns) && !e.getKey().equals(prefix)) {
					String message = String.format(
							"Conflicting namespace <%s>: already bound to prefix `%s`, now also used for `%s",
							ns, e.getKey(), prefix);
					String conflictKey = "namespace:" + ns + ":" + prefix;
					prefixConflictTracker.add(conflictKey, message, source.toString());
				}
			}
			prefixes.put(prefix, ns);
		}
		return queryStarted;
	}

	private static final Map<IRI, Pattern> QTYPES = Map.of(SHACL.SELECT, SELECT, SHACL.ASK, ASK, SHACL.CONSTRUCT,
			CONSTRUCT, SIB.DESCRIBE, DESCRIBE);

	public IRI tryToStartQuery(IRI predicate, List<String> query, String l) {
		for (Map.Entry<IRI, Pattern> e : QTYPES.entrySet()) {
			Matcher m = e.getValue().matcher(l);
			if (m.find()) {
				predicate = e.getKey();
				query.add(l.substring(m.start()));
				break;
			}
		}
		return predicate;
	}

	public boolean garlicMain(Model model, boolean tags, IRI ex, Matcher hmp) {
		String s = hmp.group(2);
		String value = hmp.group(3) == null ? "" : hmp.group(3).trim();
		switch (s) {
			case "summary":
				tags = false;
				if (!value.isEmpty())
					model.add(VF.createStatement(ex, RDFS.LABEL, VF.createLiteral(value)));
				break;
			case "description":
				tags = false;
				if (!value.isEmpty())
					model.add(VF.createStatement(ex, RDFS.COMMENT, VF.createLiteral(value)));
				break;
			case "endpoint":
				tags = false;
				for (String ep : value.split(",")) {
					String trimmed = ep.trim();
					if (!trimmed.isEmpty())
						model.add(VF.createStatement(ex, SchemaDotOrg.TARGET, VF.createIRI(trimmed)));
				}
				break;
			case "tags":
				tags = true;
				for (String tag : value.split(",")) {
					String trimmed = tag.trim();
					if (!trimmed.isEmpty())
						model.add(VF.createStatement(ex, SchemaDotOrg.KEYWORDS, VF.createLiteral(trimmed)));
				}
				break;
		}

		return tags;
	}

	public String afterColon(String s) {
		return s.substring(s.indexOf(":") + 1).trim();
	}

	private static IRI queryTypeClass(IRI predicate) {
		if (SHACL.SELECT.equals(predicate))
			return SHACL.SPARQL_SELECT_EXECUTABLE;
		if (SHACL.ASK.equals(predicate))
			return SHACL.SPARQL_ASK_EXECUTABLE;
		if (SHACL.CONSTRUCT.equals(predicate))
			return SHACL.SPARQL_CONSTRUCT_EXECUTABLE;
		if (SIB.DESCRIBE.equals(predicate))
			return SIB.SPARQL_DESCRIBE_EXECUTABLE;
		return SHACL.SPARQL_EXECUTABLE;
	}

	private List<String> extractServices(String queryString, Map<String, String> globalPrefixes, Path source) {
		try {
			ParsedQuery parsed = QueryParserUtil.parseQuery(QueryLanguage.SPARQL, queryString, null);
			List<String> services = new ArrayList<>();
			parsed.getTupleExpr().visit(new AbstractQueryModelVisitor<RuntimeException>() {
				@Override
				public void meet(Service service) {
					if (service.getServiceRef() instanceof Var v && v.hasValue() && v.getValue() instanceof IRI iri) {
						services.add(iri.stringValue());
					}
					super.meet(service);
				}
			});
			return services;
		} catch (Exception ex) {
			log.warn("Could not extract SERVICE endpoints ({}) in {}", ex.getMessage(), source);
			return List.of();
		}
	}

	public static void writeModel(Path file, Model model) {
		try (OutputStream out = Files.newOutputStream(file, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
			model.getNamespaces().add(SHACL.NS);
			model.getNamespaces().add(RDF.NS);
			model.getNamespaces().add(RDFS.NS);
			model.getNamespaces().add(SchemaDotOrg.NS);
			model.getNamespaces().add(DCTERMS.NS);
			model.getNamespaces().add(SIB.NS);
			Rio.write(model, out, RDFFormat.TURTLE);

		} catch (RDFHandlerException | IOException e) {
			throw new NeedToStopException(e, Failure.CANT_WRITE_FIXED_EXAMPLE);
		}
	}

	void setInputDirectory(Path p) {
		this.inputDirectory = p;
	}

	void setBase(String string) {
		this.base = string;
	}

	private String readEndpointTxt(Path dir, Map<Path, String> cache) {
		if (dir == null) return null;
		Path current = dir.toAbsolutePath().normalize();
		Path root = inputDirectory.toAbsolutePath().normalize();
		while (current.startsWith(root)) {
			if (cache.containsKey(current)) {
				return cache.get(current);
			}
			Path candidate = current.resolve("endpoint.txt");
			if (Files.isRegularFile(candidate)) {
				try {
					String url = Files.readAllLines(candidate).stream()
							.map(String::trim)
							.filter(line -> !line.isEmpty() && !line.startsWith("#"))
							.findFirst().orElse(null);
					cache.put(current, url);
					return url;
				} catch (IOException ex) {
					log.warn("Could not read {} ({})", candidate, ex.getMessage());
					cache.put(current, null);
					return null;
				}
			}
			cache.put(current, null);
			if (current.equals(root)) break;
			current = current.getParent();
		}
		return null;
	}
}
