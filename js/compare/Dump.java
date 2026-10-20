import static swiss.sib.rdf.sparql.examples.SparqlInRdfToRq.queryContainsPrefix;
import static swiss.sib.rdf.sparql.examples.SparqlInRdfToRq.streamOf;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.Resource;
import org.eclipse.rdf4j.model.Statement;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.impl.LinkedHashModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParser;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.helpers.StatementCollector;

import swiss.sib.rdf.sparql.examples.mermaid.SparqlInRdfToMermaid;
import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;

/**
 * The reference for the comparison with the JavaScript version, see compare.js.
 *
 * Draws every query of every .ttl file below a directory with SparqlInRdfToMermaid, and writes one line of JSON
 * for each query: the file, the query type, the query, its base, the prefixes of the RDF that the query uses, and
 * the lines of the diagram (null if the Java version could not draw it).
 *
 * Run it with the classes of this project and their dependencies on the class path:
 * {@code java -cp target/classes:<dependencies> js/compare/Dump.java out.jsonl <directory>}
 */
public class Dump {

	public static void main(String[] args) throws IOException {
		if (args.length != 2) {
			System.err.println("usage: Dump.java <output.jsonl> <directory with the sparql examples as turtle>");
			System.exit(2);
		}
		List<Path> files;
		try (Stream<Path> walk = Files.walk(Path.of(args[1]))) {
			files = walk.filter(p -> p.toString().endsWith(".ttl")).sorted().toList();
		}
		int queries = 0;
		int notDrawn = 0;
		try (PrintStream out = new PrintStream(new FileOutputStream(args[0]), false, StandardCharsets.UTF_8)) {
			for (Path file : files) {
				Model model = parse(file);
				if (model == null) {
					continue;
				}
				for (Resource executable : streamOf(model, null, RDF.TYPE, SHACL.SPARQL_EXECUTABLE)
						.map(Statement::getSubject).distinct().toList()) {
					for (IRI type : List.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)) {
						for (Statement statement : streamOf(model, executable, type, null).toList()) {
							List<String> lines = new ArrayList<>();
							SparqlInRdfToMermaid.draw(statement, model, lines);
							queries++;
							if (lines.isEmpty()) {
								notDrawn++; // draw() logs and gives nothing when the query can not be drawn
							}
							out.println(json(file, type, statement, model, lines));
						}
					}
				}
			}
		}
		System.err.println("queries=" + queries + " not-drawn-by-java=" + notDrawn);
	}

	private static Model parse(Path file) {
		Model model = new LinkedHashModel();
		RDFParser parser = Rio.createParser(RDFFormat.TURTLE);
		parser.setRDFHandler(new StatementCollector(model));
		try (InputStream in = Files.newInputStream(file)) {
			parser.parse(in);
			return model;
		} catch (Exception e) {
			return null; // not a sparql example, e.g. a file with prefixes
		}
	}

	private static String json(Path file, IRI type, Statement statement, Model model, List<String> lines) {
		String query = statement.getObject().stringValue();
		// the same as SparqlInRdfToMermaid does
		String base = streamOf(model, statement.getSubject(), SchemaDotOrg.TARGET, null).map(Statement::getObject)
				.filter(Value::isIRI).map(Value::stringValue).findFirst().orElse("https://example.org/");
		List<String> prefixes = new ArrayList<>();
		Iterator<Statement> declared = streamOf(model, null, SHACL.PREFIX_PROP, null).iterator();
		while (declared.hasNext()) {
			Statement prefix = declared.next();
			String label = prefix.getObject().stringValue() + ':';
			if (queryContainsPrefix(query, label)) {
				for (Statement namespace : streamOf(model, prefix.getSubject(), SHACL.NAMESPACE_PROP, null).toList()) {
					prefixes.add("[" + quote(namespace.getObject().stringValue()) + "," + quote(label) + "]");
				}
			}
		}
		return "{\"file\":" + quote(file.toString()) + ",\"type\":" + quote(type.getLocalName()) + ",\"query\":"
				+ quote(query) + ",\"base\":" + quote(base) + ",\"prefixes\":[" + String.join(",", prefixes)
				+ "],\"lines\":"
				+ (lines.isEmpty() ? "null" : lines.stream().map(Dump::quote).collect(Collectors.joining(",", "[", "]")))
				+ "}";
	}

	private static String quote(String text) {
		StringBuilder sb = new StringBuilder("\"");
		for (char c : text.toCharArray()) {
			switch (c) {
			case '"' -> sb.append("\\\"");
			case '\\' -> sb.append("\\\\");
			case '\n' -> sb.append("\\n");
			case '\r' -> sb.append("\\r");
			case '\t' -> sb.append("\\t");
			default -> {
				if (c < 0x20) {
					sb.append(String.format("\\u%04x", (int) c));
				} else {
					sb.append(c);
				}
			}
			}
		}
		return sb.append('"').toString();
	}
}
