package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.riot.RDFDataMgr;
import org.apache.jena.riot.RiotException;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.function.Executable;

import swiss.sib.rdf.sparql.examples.FindFiles;

public class ValidateSparqlExamplesTest {

	@TestFactory
	public Stream<DynamicTest> testAllWithJena() throws URISyntaxException, IOException {
		Function<Path, Executable> tester = p -> () -> CreateTestWithJenaMethods.testQueryValid(p);
		return testAll(tester);
	}

	@TestFactory
	public Stream<DynamicTest> testAllWithRDF4j() throws URISyntaxException, IOException {
		Function<Path, Executable> tester = p -> () -> CreateTestWithRDF4jMethods.testQueryValid(p);
		return testAll(tester);
	}
	
	@Tag("VoIDTest")
	@TestFactory
	public Stream<DynamicTest> testAllWithRDF4jVoID() throws URISyntaxException, IOException {
		return testAll(CreateTestWithRDF4jMethods::testQueryMatchesVoid);
	}
	
	@TestFactory
	public Stream<DynamicTest> testAllWithBigData() throws URISyntaxException, IOException {
		Function<Path, Executable> tester = p -> () -> CreateTestWithBigDataMethods.testQueryValid(p);
		return testAll(tester);
	}

	@Tag("SlowTest")
	@TestFactory
	public Stream<DynamicTest> testAllService() throws URISyntaxException, IOException {
		Function<Path, Stream<String>> tester = p -> CreateTestWithRDF4jMethods.extractServiceEndpoints(p);
		Consumer<String> consumer = s -> {
			try (HttpClient client = HttpClient.newHttpClient()) {
				HttpRequest askAnything = HttpRequest.newBuilder()
						.uri(new URI(s + "?query=ASK%20%7B%3Fs%20%3Fp%20%3Fo%7D"))
						.setHeader("accept", "application/sparql-results+xml,application/sparql-results+json")
						.setHeader("user-agent", "sib-sparql-examples-bot").GET().build();
				HttpResponse<String> response = client.send(askAnything, HttpResponse.BodyHandlers.ofString());
				String body = response.body();
				if (response.statusCode() != 200) {
					Map<String, List<String>> map = response.headers().map();
					if (map.containsKey("location")) {
						fail("Endpoint moved to " + map.get("location"));
					} else {
						fail(response.statusCode() + ' ' + map.entrySet().stream().map((e) -> {
							return e.getKey() + ":" + e.getValue();
						}).collect(Collectors.joining(" ")));
					}
				}
				assertTrue(body.contains("true") || body.contains("false"));
			} catch (URISyntaxException | IOException e) {
				fail(s, e);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				fail(s, e);
			}
		};
		Function<Stream<String>, Stream<DynamicTest>> test = iris ->  iris.distinct().map(s -> DynamicTest.dynamicTest(s, () -> consumer.accept(s)));
		return testAllAsOne(tester, test);
	}

	@TestFactory
	@Tag("SlowTest")
	public Stream<DynamicTest> testAllQueriesRun() throws URISyntaxException, IOException {
		Function<Path, Executable> tester = (p) -> () -> CreateTestWithRDF4jMethods.testQueryRuns(p);
		return testAll(tester);
	}

	@TestFactory
	public Stream<DynamicTest> testPrefixDeclarations() throws IOException {
		return FindFiles.allPrefixFiles().flatMap(this::testPrefixes);
	}

	private Stream<DynamicTest> testAll(Function<Path, Executable> tester) throws IOException {
		return FindFiles.sparqlExamples().map(p -> createTest(tester, p.getParent(), p)).filter(Objects::nonNull);
	}

	private <T> Stream<DynamicTest> testAllAsOne(Function<Path, Stream<T>> tester,
			Function<Stream<T>, Stream<DynamicTest>> test) throws IOException {
		return test.apply(FindFiles.sparqlExamples().flatMap(tester::apply));
	}
	
	@TestFactory
    public Stream<DynamicTest> testAllServicesAnnotated() throws URISyntaxException, IOException {

            Function<Path, Executable> tester = (p) -> () -> CreateTestWithRDF4jMethods.testQueryAnnotatedWithFederatesWith(p);
            return testAll(tester);
    }


	private DynamicTest createTest(Function<Path, Executable> tester, Path projectPath, Path specificExamplePath) {
		String testName = pathToTestName(specificExamplePath);
		Executable apply = tester.apply(specificExamplePath);
		if (apply != null) {
			return DynamicTest.dynamicTest(testName, specificExamplePath.toUri(), apply);
		} else {
			return null;
		}
	}

	private String pathToTestName(Path specificExamplePath) {
		return specificExamplePath.getParent().getFileName().toString() + '/'
				+ specificExamplePath.getFileName().toString();
	}

	private Stream<DynamicTest> testPrefixes(Path prefixes) {
		if (Files.exists(prefixes)) {
			return Stream.of(DynamicTest.dynamicTest(pathToTestName(prefixes), () -> {
				try {
					Model model = RDFDataMgr.loadModel(prefixes.toUri().toString());
					assertFalse(model.isEmpty());
				} catch (RiotException e) {
					fail(e);
				}
			}));
		} else {
			return Stream.empty();
		}
	}
}
