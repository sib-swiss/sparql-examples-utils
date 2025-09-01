package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import org.eclipse.rdf4j.common.exception.ValidationException;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.vocabulary.RDF4J;
import org.eclipse.rdf4j.repository.Repository;
import org.eclipse.rdf4j.repository.RepositoryConnection;
import org.eclipse.rdf4j.repository.RepositoryException;
import org.eclipse.rdf4j.repository.sail.SailRepository;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.sail.memory.MemoryStore;
import org.eclipse.rdf4j.sail.shacl.ShaclSail;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import swiss.sib.rdf.sparql.examples.FindFiles;

public class ValidateSparqlExamplesWithSHACLTest {
	private static MemoryStore memoryStore;
	private static Repository repo;

	private static ShaclSail shaclSail;

	@BeforeAll
	public static void setup() {
		memoryStore = new MemoryStore();
		memoryStore.init();

		shaclSail = new ShaclSail(memoryStore);
		repo = new SailRepository(shaclSail);

		try (RepositoryConnection connection = repo.getConnection();
				var is = ValidateSparqlExamplesWithSHACLTest.class.getResourceAsStream("/spex.shacl")) {
			// add shapes
			connection.begin();
			connection.add(is, RDFFormat.TURTLE, RDF4J.SHACL_SHAPE_GRAPH);
			connection.commit();
		} catch (RDFParseException | RepositoryException | IOException e) {
			fail(e);
		}
	}

	@AfterAll
	public static void tearDown() {
		repo.shutDown();
		shaclSail.shutDown();
		memoryStore.shutDown();
	}

	/**
	 * Use shacl to test all the turtle files contain at least one rdfs:comment and
	 * one query. Also makes a test that all example IRIs are unique.
	 * 
	 * @return a test for each file.
	 * @throws URISyntaxException
	 * @throws IOException
	 */
	@TestFactory
	public Stream<DynamicTest> testShaclConstraints() throws IOException {
		Stream<Path> paths = FindFiles.sparqlExamples();
		Stream<Path> paths2= Files.list(FindFiles.getBasePath()).filter(Files::isDirectory).flatMap(projectPath -> {
			try {
				return FindFiles.sparqlExamples(projectPath);
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
		});
		
		return Stream.concat(paths, paths2).map(p -> DynamicTest.dynamicTest(
				"Shacl testing: " + p.getParent().getFileName() + '/' + p.getFileName(), () -> testValidatingAFile(p)));
	}

	static void testValidatingAFile(Path p) {
		assertTrue(Files.exists(p));
		try (RepositoryConnection connection = repo.getConnection()) {

			IRI iri = connection.getValueFactory().createIRI(p.toUri().toString());
			connection.begin();
			connection.add(p.toFile(), iri);
			connection.commit();
			assertFalse(connection.size() == 0);
		} catch (RDFParseException | RepositoryException | IOException e) {
			if (e.getCause() instanceof ValidationException ve) {
				String report = validationReportAsString(ve);
				fail(p.toUri() + " failed " + ve + '\n' + report);
			} else {
				fail(p.toUri() + " failed with a non SHACL error", e);
			}
		}
	}

	private static String validationReportAsString(ValidationException ve) {
		Model vem = ve.validationReportAsModel();
		var boas = new ByteArrayOutputStream();
		Rio.write(vem, boas, RDFFormat.TURTLE);
		return boas.toString();
	}
}
