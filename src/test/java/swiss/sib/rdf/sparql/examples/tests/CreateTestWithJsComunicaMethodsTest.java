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
import swiss.sib.rdf.sparql.examples.tests.CreateTestWithJSComunicaMethods.JSSetupExcpetion;

class CreateTestWithJsComunicaMethodsTest {
	@TempDir
	Path tempDir;
	
	
	@Test
	void testTestQueryValid() throws IOException {
		Path test = tempDir.resolve("./test.ttl");
		Files.createFile(test);
		Files.writeString(test, ExamplesUsedInTest.rhea9);
		
		try (CreateTestWithJSComunicaMethods jst = new CreateTestWithJSComunicaMethods()){
			jst.testQueryValid(test);
		} catch (JSSetupExcpetion e) {
			fail(e);
		}
	}
	
	@Test
	void testTestQueryInValid() throws IOException {
		
		
		try (CreateTestWithJSComunicaMethods jst = new CreateTestWithJSComunicaMethods()){
			Optional<String> apply = jst.tester.apply("SELECT ?s {?S ?p");
			assertTrue(apply.isPresent());
			assertNotNull(apply.get(), apply.get());
		} catch (JSSetupExcpetion e) {
			fail(e);
		}
	}

}
