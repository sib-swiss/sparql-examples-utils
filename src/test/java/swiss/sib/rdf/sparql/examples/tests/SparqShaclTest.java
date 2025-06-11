package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.opentest4j.AssertionFailedError;

import swiss.sib.rdf.sparql.examples.ExamplesUsedInTest;

public class SparqShaclTest {
	@TempDir
	Path p;

	@BeforeAll
	static void setup() {
		ValidateSparqlExamplesWithSHACLTest.setup();
	}

	@AfterAll
	static void tearDown() {
		ValidateSparqlExamplesWithSHACLTest.tearDown();
	}

	@Test
	void simple() throws IOException {
		Path simple = p.resolve("simple.ttl");
		Files.writeString(simple, ExamplesUsedInTest.simple);
		ValidateSparqlExamplesWithSHACLTest.testValidatingAFile(simple);
	}

	@Test
	void errorIntroduced() throws IOException {
		Path simple = p.resolve("simple.ttl");
		StringBuilder toMakeWrong = new StringBuilder(ExamplesUsedInTest.simple);
		toMakeWrong.insert(toMakeWrong.lastIndexOf(".") - 1, " ; schema:keyowrds '''lala'''");
		Files.writeString(simple, toMakeWrong);
		boolean failed = false;
		try {
			ValidateSparqlExamplesWithSHACLTest.testValidatingAFile(simple);
		} catch (AssertionFailedError e) {
			if (e.getMessage().contains("Failed SHACL validation")) {
				failed = true;
			}
		}
		assertTrue(failed, "We should have detected a shacl validation failure");
	}
}
