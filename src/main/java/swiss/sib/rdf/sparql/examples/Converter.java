package swiss.sib.rdf.sparql.examples;

import static org.eclipse.rdf4j.common.lang.FileFormat.matchFileName;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileVisitOption;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Model.CommandSpec;
import picocli.CommandLine.Option;
import picocli.CommandLine.Spec;
import swiss.sib.rdf.sparql.examples.vocabularies.SIB;

@Command(name = "convert", description = "Converts example files into RDF")
public class Converter implements Callable<Integer>{
	@Spec 
	CommandSpec spec;
	
	private static final SimpleValueFactory VF = SimpleValueFactory.getInstance();

	private final Set<RDFFormat> outputFormats = Set.of(RDFFormat.TURTLE, RDFFormat.RDFXML, RDFFormat.NTRIPLES,
			RDFFormat.JSONLD, RDFFormat.NDJSONLD);

	@Option(names = { "-f",
			"--format" }, paramLabel = "output RDF format", description = "the format that the example queries with their prefixes should be concattenated into", defaultValue = "ttl")
	private String outputFormat;

	@Option(names = { "-r",
			"--rq" }, paramLabel = "output example files as rq files next to the exiting turtle", description = "output example files as rq files next to the exiting turtle", defaultValue = "false")
	private boolean outputRq;
	
    @Option(names = { "-m",
			"--markdown" }, paramLabel = "output example files as markdown files next to the exiting turtle", description = "output example files as markdown files next to the exiting turtle", defaultValue = "false")
	private boolean outputMd;


	@Option(names = { "-i",
			"--input-directory" }, paramLabel = "directory containing example files to convert", description = "The root directory where the examples and their prefixes can be found.", required = true)
	private Path inputDirectory;

	@Option(names = { "-h", "--help" }, usageHelp = true, description = "display this help message")
	private boolean usageHelpRequested;

	@Option(names = { "-p", "--project" }, paramLabel = "projects to convert", defaultValue = "all")
	private String projects;

	public Integer call() {
		CommandLine commandLine = spec.commandLine();
		System.err.println("inputDirectory: "+inputDirectory);
		
		System.setProperty(Tester.class.getName(), inputDirectory.toString());
		if (commandLine.isUsageHelpRequested()) {
			commandLine.usage(System.out);
			return 0;
		} else if (commandLine.isVersionHelpRequested()) {
			commandLine.printVersionHelp(System.out);
			return 0;
		} else {
			try {
				if (outputMd) {
					Map<String, Function<Model, List<String>>> m = Map.of("algebra-statistics.",
							SparqlInRdfToMd::asStatisticsMD, "void-statistics", SparqlInRdfToMd::asSchemaMD);
					convertPerSingle("md", SparqlInRdfToMd::asMD, SparqlInRdfToMd::asIndexMD, m);
				} else if (outputRq) {
					convertPerSingle("rq", SparqlInRdfToRq::asRq, null, Collections.emptyMap());
				} else {
					convertToRdf();
				}
			} catch (NeedToStopException e) {
				System.err.println(e.getMessage());
				return e.getFailure().exitCode();
			}
		}
		return 0;
	}

	private static final Pattern COMMA = Pattern.compile(",", Pattern.LITERAL);

	private void convertToRdf() throws NeedToStopException {
		Model model = parseExampleFilesIntoModel(projects, inputDirectory);
		print(model);
	}

	static Model parseExampleFilesIntoModel(String projects, Path inputDirectory) throws NeedToStopException {
		Model model = new LinkedHashModel();
		if ("all".equals(projects)) {
			try (Stream<Path> list = Files.list(inputDirectory)) {
				parseAll(list, model, inputDirectory);
			} catch (IOException e) {
				throw new NeedToStopException(e, Failure.CANT_READ_INPUT_DIRECTORY);
			}
		} else {
			try (Stream<Path> list = COMMA.splitAsStream(projects).map(inputDirectory::resolve)) {
				parseAll(list, model, inputDirectory);
			}
		}
		return model;
	}

	private void convertPerSingle(String extension, Function<Model, List<String>> converter, Function<Model, List<String>> converterPerProject, Map<String, Function<Model, List<String>>> converterForAll) throws NeedToStopException{
		if ("all".equals(projects)) {
			try (Stream<Path> subInputDirs = Files.list(inputDirectory).filter(Files::isDirectory)) {
				convertProjectsPerSingle(subInputDirs, extension, converter, converterPerProject);
			} catch (IOException e) {
				throw new NeedToStopException(e, Failure.CANT_READ_INPUT_DIRECTORY);
			}
		} else {
			try (Stream<Path> subInputDirs = COMMA.splitAsStream(projects).map(inputDirectory::resolve)) {
				convertProjectsPerSingle(subInputDirs, extension, converter, converterPerProject);
			}
		}
		if (! converterForAll.isEmpty()) {
			Model all = collectAllIntoSingleModel();
			for (var en:converterForAll.entrySet()) {
				String prqfn = en.getKey()+extension;
				Path indexMd = inputDirectory.resolve(prqfn);
				try {
					List<String> rq = en.getValue().apply(all);
					Files.write(indexMd, rq, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
				} catch (IOException e) {
					throw Failure.CANT_WRITE_EXAMPLE_RQ.tothrow(e);
				}
			}
		}
	}

	private Model collectAllIntoSingleModel() {
		try (Stream<Path> list = Files.list(inputDirectory)) {
			Optional<Path> findCommonPrefixes = FindFiles.prefixFile(inputDirectory).findFirst();
			Model all = new LinkedHashModel();
			Model commonPrefixes = prefixModel(findCommonPrefixes);
			all.addAll(commonPrefixes);
			list.filter(Files::isDirectory).forEach(pro -> {
				Optional<Path> findProjectPrefixes = FindFiles.prefixFile(pro).findFirst();
				Model projectPrefixes = prefixModel(findProjectPrefixes);
				all.addAll(projectPrefixes);
				try {
					FindFiles.sparqlExamples(pro).forEach(p -> parseAndRenderSingleExample(null, null,
							commonPrefixes, projectPrefixes, all, p));
				} catch (IOException e) {
					throw Failure.CANT_READ_INPUT_DIRECTORY.tothrow(e);
				}
			});
			return all;
		} catch (IOException e) {
			throw Failure.CANT_READ_INPUT_DIRECTORY.tothrow(e);
		}
	}

	private void convertProjectsPerSingle(Stream<Path> list, String extension, Function<Model, List<String>> converter, Function<Model, List<String>> convertPerProject) {
		Optional<Path> findCommonPrefixes = FindFiles.prefixFile(inputDirectory).findFirst();
		Model commonPrefixes = prefixModel(findCommonPrefixes);
		list
		.flatMap(p -> {
			try {
				return Files.walk(p, FileVisitOption.FOLLOW_LINKS);
			} catch (IOException e) {
				throw Failure.CANT_READ_EXAMPLE.tothrow(e);
			}
		})
		.filter(Files::isDirectory)
		.forEach(pro -> {
			try {
				Optional<Path> findProjectPrefixes = FindFiles.prefixFile(pro).findFirst();
				Model projectPrefixes = prefixModel(findProjectPrefixes);
				Model allForProject = new LinkedHashModel();
				allForProject.addAll(commonPrefixes);
				allForProject.addAll(projectPrefixes);
				FindFiles.sparqlExamples(pro).forEach(p -> parseAndRenderSingleExample(extension, converter,
						commonPrefixes, projectPrefixes, allForProject, p));
				if (convertPerProject != null) {
					renderAllExamplesInAProject(extension, convertPerProject, pro, allForProject);
				}
			} catch (IOException e) {
				throw Failure.CANT_PARSE_EXAMPLE.tothrow(e);
			}
		});
	}

	private void renderAllExamplesInAProject(String extension, Function<Model, List<String>> convertPerProject,
			Path pro, Model allForProject) {
		String prqfn = "index."+extension;
		Path indexMd = pro.resolve(prqfn);
		try {
			try (Stream<Path> subs = Files.list(pro).filter(Files::isDirectory).filter(d -> {
				try {
					return FindFiles.sparqlExamples(d).findAny().isPresent();
				} catch (IOException e) {
					throw Failure.CANT_READ_EXAMPLE.tothrow(e);
				}
			})) {
				subs.forEach(p -> {
					allForProject.add(VF.createStatement(VF.createIRI(pro.toUri().toString()), SIB.SUB_PROJECT,
							VF.createLiteral(p.getFileName().toString())));
				});
			}
			List<String> rq = convertPerProject.apply(allForProject);
			Files.write(indexMd, rq, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (IOException e) {
			throw Failure.CANT_WRITE_EXAMPLE_RQ.tothrow(e);
		}
	}

	private void parseAndRenderSingleExample(String extension, Function<Model, List<String>> converter,
			Model commonPrefixes, Model projectPrefixes, Model allForProject, Path p) throws NeedToStopException {
		Model ex = parseSingle(p);
		ex.addAll(commonPrefixes);
		ex.addAll(projectPrefixes);
		allForProject.addAll(ex);
		Iterator<Statement> iterator = ex.getStatements(null, RDF.TYPE, SHACL.SPARQL_EXECUTABLE).iterator();
		if (iterator.hasNext()) {
			addTriplesUsedDuringBuild(allForProject, p, iterator.next().getSubject());
		}
		
		if (converter != null) {
			String pfn = p.getFileName().toString();
			String prqfn = pfn.substring(0, pfn.indexOf('.')) + "."+extension;
			Path prq = p.getParent().resolve(prqfn);
			try {
				List<String> rq = converter.apply(ex);
				Files.write(prq, rq, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
			} catch (IOException e) {
				throw Failure.CANT_WRITE_EXAMPLE_RQ.tothrow(e);
			}
		}
	}

	protected static void addTriplesUsedDuringBuild(Model allForProject, Path p, Resource subject) {
		
		File file = p.toFile();
		allForProject.add(VF.createStatement(subject, SIB.FILE_NAME, VF.createLiteral(file.getName())));
		allForProject.add(VF.createStatement(subject, SIB.FILE_PATH, VF.createLiteral(file.toString())));
		allForProject.add(VF.createStatement(subject, SIB.PROJECT, VF.createLiteral(p.getParent().getFileName().toString())));
	}

	private Model prefixModel(Optional<Path> findFirst) {
		Model prefixes = new LinkedHashModel();
		if (findFirst.isPresent() && Files.exists(findFirst.get())) {
			prefixes = parseSingle(findFirst.get());
		}
		return prefixes;
	}

	static void parseAll(Stream<Path> paths, Model model, Path inputDirectory) {
		Stream.concat(FindFiles.prefixFile(inputDirectory), paths.flatMap(arg0 -> {
			try {
				return Stream.concat(FindFiles.prefixFile(arg0), FindFiles.sparqlExamples(arg0));
			} catch (IOException e) {
				throw Failure.CANT_READ_EXAMPLE.tothrow(e);
			}
		})).filter(Files::exists).parallel().forEach(p -> {
			parseTurtleFileIntoModel(model, p);
		});
	}

	private Model parseSingle(Path path) throws NeedToStopException {
		Model model = new LinkedHashModel();
		parseTurtleFileIntoModel(model, path);
		
		return model;
	}

	static void parseTurtleFileIntoModel(Model model, Path p) throws NeedToStopException {
		RDFParser rdfParser = Rio.createParser(RDFFormat.TURTLE);
		Model temp = new LinkedHashModel();
		rdfParser.setRDFHandler(new StatementCollector(temp));
		try (InputStream is = Files.newInputStream(p)) {
			rdfParser.parse(is);
		} catch (RDFParseException | RDFHandlerException e) {
			System.err.println("Failed to parse " + p);
			throw new NeedToStopException(e, Failure.CANT_PARSE_EXAMPLE);
		} catch (IOException e) {
			throw new NeedToStopException(e, Failure.CANT_READ_EXAMPLE);
		}
		temp.getStatements(null, RDF.TYPE, SHACL.SPARQL_EXECUTABLE).forEach(s -> {
			addTriplesUsedDuringBuild(temp, p, s.getSubject());
		});
		model.addAll(temp);
	}

	private void print(Model model) {
		Rio.write(model, System.out,
				matchFileName("a." + outputFormat, outputFormats).orElse(RDFFormat.TURTLE));
	}

}
