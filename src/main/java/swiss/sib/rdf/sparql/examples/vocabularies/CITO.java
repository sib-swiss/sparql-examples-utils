package swiss.sib.rdf.sparql.examples.vocabularies;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;

public class CITO {
	public static final String NAMESPACE = "http://purl.org/spar/cito/";

	public static final IRI USES_METHOD_IN = SimpleValueFactory.getInstance().createIRI(NAMESPACE, "usesMethodIn");

	private CITO() {}
}
