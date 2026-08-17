package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Optional;
import java.util.function.Function;
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
import org.graalvm.polyglot.PolyglotException;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.io.ByteSequence;
import org.graalvm.polyglot.io.IOAccess;

import swiss.sib.rdf.sparql.examples.vocabularies.SIB;

/**
 * Test the SPARQL query for parsing with QLever which is in C++ compiled to WebAssembly.
 * The WASM
 * 
 * Can be updated by 
 * 
 * <pre>
 * {@code npm install @ad-freiburg/qlever}
 * </pre> 
 */
public class CreateTestWithQleverWasm implements AutoCloseable {
	private static final String WASM = "wasm";
	
	public static class WasmSetupException extends Exception{
		private static final long serialVersionUID = 1L;

		public WasmSetupException(String message) {
			super(message);
		}

		public WasmSetupException(String string, Exception e) {
			super(string, e);
		}
	}
	
	
	private static final String testJs = """
			function isValidSparql(parser, query) {
				try {
					parser.parse(query);
					return { valid: true };
				} catch (err) {
					return { valid: false, error: err.message };
				}
			}
			""";
	private final Context context;
	final Function<String, Optional<String>> tester;
	public CreateTestWithQleverWasm() throws WasmSetupException {
		context = Context.newBuilder(WASM)
				.allowIO(IOAccess.NONE)
				.option("engine.WarnInterpreterOnly", "false")
				.allowExperimentalOptions(true)
				.option("wasm.UseUnsafeMemory", "true")
				.option("wasm.Memory64", "true")
				.option("wasm.Threads", "true")
				.option("wasm.Exceptions", "true")
				.build();
		tester = makeFunction(context);
	}

	static  Function<String, Optional<String>> makeFunction(Context context) throws WasmSetupException {
		
		try (InputStream is = CreateTestWithQleverWasm.class
                .getResourceAsStream("/qlever.wasm")){
			if (is == null) {
				throw new WasmSetupException("qlever.wasm missing from resources!");
			}
			Source source = Source.newBuilder(WASM, ByteSequence.create(is.readAllBytes()), "qlever") 
                    .build();
			//load the module in the context but ignore the result
			var module = context.eval(source);
			var qlever = module.newInstance();
            return q -> {
            	try {
	            	return Optional.empty();
            	} catch (PolyglotException e) {
            		return Optional.of(e.getMessage());
            	}
            };
		} catch (IOException e) {
			throw new WasmSetupException("traqula-parser.js missing from resources!", e);
		}
	}
	void testQueryValid(Path p) {
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
	
			Stream.of(SHACL.ASK, SHACL.SELECT, SHACL.CONSTRUCT, SIB.DESCRIBE)
					.map(s -> model.getStatements(null, s, null)).map(Iterable::iterator)
					.forEach(this::testAllQueryStringsInModel);
	}

	private void testAllQueryStringsInModel(Iterator<Statement> i) {
		while (i.hasNext()) {
			Statement next = i.next();
			testQueryStringInValue(next);
		}
	}

	//Not sure the context is thread safe, so synchronise the call to the js function
	synchronized void testQueryStringInValue(Statement next) {
		Value obj = next.getObject();
		assertNotNull(obj);
		assertTrue(obj.isLiteral());
		String query = obj.stringValue();
		Optional<String> result = tester.apply(query);
		assertTrue(result.isEmpty(), "Query not valid according to Traqula: " + query +" Result: " + result.orElseGet(() -> "OK"));
	}

	@Override
	public void close() {
		context.close();
	}
}
