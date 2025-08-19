package swiss.sib.rdf.sparql.examples.tests;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import swiss.sib.rdf.sparql.examples.ExamplesUsedInTest;

class CreateTestWithPythonRdfLibMethodsTest {
	@TempDir
	Path tempDir;
	
	
	@Test
	void testTestQueryValid() throws IOException {
		Path test = tempDir.resolve("./test.ttl");
		Files.createFile(test);
		Files.writeString(test, ExamplesUsedInTest.rhea9);
		CreateTestWithPythonRdfLibMethods.testQueryValid(test);
	}

}
