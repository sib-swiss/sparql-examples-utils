package swiss.sib.rdf.sparql.examples.mermaid;

import java.util.Map;
import java.util.regex.Pattern;

import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Literal;
import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.XSD;

/**
 * The text of the nodes and edges of a mermaid diagram, which has to be safe in a double quoted label.
 */
final class Labels {

	private static final Pattern WHITESPACE = Pattern.compile("\\s+");

	private Labels() {
	}

	/**
	 * Mermaid has no backslash escapes, it uses #name; and #number; instead. A label may not have a quote
	 * in it, and mermaid reads &lt; and &gt; as html.
	 */
	static String escape(String in) {
		return WHITESPACE.matcher(in.replace("\"", "#quot;").replace("<", "#lt;").replace(">", "#gt;")
				.replace("[", "#91;").replace("]", "#93;").replace("`", "#96;")).replaceAll(" ");
	}

	/**
	 * @return the text as a double quoted mermaid label
	 */
	static String quote(String text) {
		return '"' + escape(text) + '"';
	}

	/**
	 * @return how a value is shown: IRIs with the prefix of their namespace, strings as they are, other
	 *         literals as value^^xsd:type or value@language. Not escaped.
	 */
	static String text(Value v, Map<String, String> iriPrefixes) {
		if (v instanceof IRI i) {
			return iri(i.stringValue(), iriPrefixes);
		} else if (v instanceof Literal l) {
			return literal(l, iriPrefixes);
		} else if (v != null) {
			return v.stringValue();
		} else {
			return "";
		}
	}

	/**
	 * @return the IRI with the prefix of the first namespace that matches, which is the longest because that is
	 *         how iriPrefixes is sorted, rdf:type as a
	 */
	static String iri(String iri, Map<String, String> iriPrefixes) {
		if (RDF.TYPE.stringValue().equals(iri)) {
			return "a";
		}
		for (Map.Entry<String, String> en : iriPrefixes.entrySet()) {
			if (iri.startsWith(en.getKey())) {
				return en.getValue() + iri.substring(en.getKey().length());
			}
		}
		return iri;
	}

	private static String literal(Literal l, Map<String, String> iriPrefixes) {
		String label = l.getLabel();
		var language = l.getLanguage();
		if (language.isPresent()) {
			return label + '@' + language.get();
		}
		IRI datatype = l.getDatatype();
		if (XSD.STRING.equals(datatype)) {
			return label.isEmpty() ? "\"\"" : label; // mermaid does not allow an empty label
		} else if (datatype.stringValue().startsWith(XSD.NAMESPACE)) {
			return label + "^^xsd:" + datatype.getLocalName();
		}
		return label + "^^" + iri(datatype.stringValue(), iriPrefixes);
	}
}
