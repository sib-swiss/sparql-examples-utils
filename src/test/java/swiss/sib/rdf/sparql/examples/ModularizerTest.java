package swiss.sib.rdf.sparql.examples;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.eclipse.rdf4j.model.impl.TreeModel;
import org.junit.jupiter.api.Test;

public class ModularizerTest {
	String input = """
			select ?s
			where {
				?s a <http://example.org/Example>
			}
			""";
	
	@Test
	void simpleModule() {
		String baseIri = "https://example.org/base/";
		TreeModel model = new TreeModel();
		Modularizer.modularizeQuery(baseIri, input, model);
		
		assertNotNull(model);
		assertFalse(model.isEmpty());
		
	}
}
