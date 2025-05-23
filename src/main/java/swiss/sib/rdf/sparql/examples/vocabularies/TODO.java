package swiss.sib.rdf.sparql.examples.vocabularies;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Namespace;
import org.eclipse.rdf4j.model.base.AbstractNamespace;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;


public class TODO {
	public static final String NAMESPACE = "https://example.org/TODO#";
	public static final String PREFIX = "todo";
	
	//Todo: finalize module associated constants
	public static final IRI PORT = SimpleValueFactory.getInstance().createIRI(NAMESPACE, "Port");
	public static final IRI NAME = SimpleValueFactory.getInstance().createIRI(NAMESPACE, "name");
	public static final IRI OPTION = SimpleValueFactory.getInstance().createIRI(NAMESPACE, "options");

	public static final Namespace NS = new AbstractNamespace() {

		private static final long serialVersionUID = 1L;

		@Override
		public String getPrefix() {
			return PREFIX;
		}

		@Override
		public String getName() {
			return NAMESPACE;
		}
		
	};
	
	
	private TODO() {
		
	}
}
