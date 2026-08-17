package swiss.sib.rdf.sparql.examples.tests;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import swiss.sib.rdf.sparql.examples.ExamplesUsedInTest;
import swiss.sib.rdf.sparql.examples.tests.CreateTestWithQleverWasm.WasmSetupException;

class CreateTestWithQleverWasmMethodsTest {
	@TempDir
	Path tempDir;
	
	
	@Test
	void testTestQueryValid() throws IOException {
		Path test = tempDir.resolve("./test.ttl");
		Files.createFile(test);
		Files.writeString(test, ExamplesUsedInTest.rhea9);
		
		try (CreateTestWithQleverWasm jst = new CreateTestWithQleverWasm()){
			jst.testQueryValid(test);
		} catch (WasmSetupException e) {
			fail(e);
		}
	}
	
	@Test
	void testTestQueryInValid() throws IOException {
		
		
		try (CreateTestWithQleverWasm jst = new CreateTestWithQleverWasm()){
			Optional<String> apply = jst.tester.apply("SELECT ?s {?S ?p");
			assertTrue(apply.isPresent());
			assertNotNull(apply.get(), apply.get());
		} catch (WasmSetupException e) {
			fail(e);
		}
	}

}
