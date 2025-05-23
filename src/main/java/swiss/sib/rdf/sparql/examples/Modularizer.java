package swiss.sib.rdf.sparql.examples;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Set;
import java.util.concurrent.Callable;

import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.vocabulary.DCTERMS;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;
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

@CommandLine.Command(name = "modularize", description = "Attempts to import a single *.ttl example file")
public class Modularizer implements Callable<Integer> {
	private static final Logger log = LoggerFactory.getLogger(Modularizer.class);
	private static final ValueFactory VF = SimpleValueFactory.getInstance();

	@Spec
	CommandSpec spec;

	@Option(names = { "-i",
			"--input-file" }, paramLabel = "File containing example to turn into a module", required = true)
	private Path inputFile;

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
				modularize(inputFile);
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

	public static void modularize(Path inputFile) throws IOException {
		log.info("Modularizing {}", inputFile);
		try (var is = Files.newInputStream(inputFile)) {
			Model model = Rio.parse(is, RDFFormat.TURTLE);
			Iterable<Statement> selects = model.getStatements(null, SHACL.SELECT, null);
			for (Statement select : selects) {
				Literal query = (Literal) select.getObject();
				String queryString = query.stringValue();
				modularizeQuery(inputFile.toUri().toASCIIString(), queryString, model);
			}
		}
	}

	static void modularizeQuery(String baseIri, String queryString, Model model) {
		
		SPARQLParser parser = new SPARQLParser();
		ParsedQuery qast = parser.parseQuery(queryString, baseIri);
		Set<Var> outputPorts = findOutputPorts(qast.getTupleExpr());
		Set<Var> inboundPorts = findInputPorts(qast.getTupleExpr());
		log.info("Output ports: {}", outputPorts);
		log.info("Input ports: {}", inboundPorts);
		for (Var outputPort : outputPorts) {
			model.add(VF.createIRI(varAsIri(baseIri, outputPort)), RDF.TYPE, SIB.PORT);
		}
	}

	private static String varAsIri(String baseIri, Var outputPort) {
		if (baseIri.endsWith("#")) {
			return baseIri = baseIri + outputPort.getName();
		} else {
			return baseIri + "#" + outputPort.getName();
		}
	}

	private static Set<Var> findInputPorts(TupleExpr tupleExpr) {
		// TODO Auto-generated method stub
		return Set.of();
	}

	private static Set<Var> findOutputPorts(TupleExpr tupleExpr) {
		// TODO Auto-generated method stub
		return Set.of();
	}

	public static void writeModel(Path file, Model model) {
		try (OutputStream out = Files.newOutputStream(file, StandardOpenOption.CREATE_NEW)) {
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
}
