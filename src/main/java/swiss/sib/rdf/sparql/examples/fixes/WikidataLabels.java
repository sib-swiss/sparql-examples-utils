package swiss.sib.rdf.sparql.examples.fixes;

import java.util.regex.Pattern;

import org.eclipse.rdf4j.query.MalformedQueryException;
import org.eclipse.rdf4j.query.parser.sparql.SPARQLParser;

import swiss.sib.rdf.sparql.examples.Fixer.Fixed;

public class WikidataLabels {
	private static final Pattern SERVICE_PATTERN = Pattern.compile("SERVICE wikibase:label", Pattern.CASE_INSENSITIVE);
	private WikidataLabels() {
		
	}
	
	public static Fixed fix(Fixed original) {
		String q;
		if (original.changed()) {
			q = original.fixed();
		} else {
			q = original.original();
		}
		try {
			SPARQLParser sparqlParser = new SPARQLParser();
            sparqlParser.parseQuery(q, "http://www.wikidata.org/");
		} catch (MalformedQueryException e) {
			if (SERVICE_PATTERN.matcher(q).find()) {
				
			}
			return original;
		}
		return original;
		
	}
}
