package swiss.sib.rdf.sparql.examples.vocabularies;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

public class Scholia {
	public static final String NAMESPACE = "http://scholia.toolforge.org/ns/";

	// TODO: should be renamed to parameter
	public static final IRI VARIABLE = SimpleValueFactory.getInstance().createIRI(NAMESPACE, "variable");
	public static final IRI VARIABLE_EXAMPLE = SimpleValueFactory.getInstance().createIRI(NAMESPACE, "variableExample");
	
	private Scholia() {}
}
