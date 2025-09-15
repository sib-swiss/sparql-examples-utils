package swiss.sib.rdf.sparql.examples.statistics;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpClient.Builder;
import java.net.http.HttpClient.Redirect;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandler;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFParseException;
import org.eclipse.rdf4j.rio.Rio;
import org.eclipse.rdf4j.rio.UnsupportedRDFormatException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ServiceDescription {
	private static Logger logger = LoggerFactory.getLogger(ServiceDescription.class);

	private ServiceDescription() {

	}

	public static Model retrieveVoidDataFromServiceDescription(String endpoint) throws RDFParseException, UnsupportedRDFormatException, IOException, InterruptedException {
		Builder hcb = HttpClient.newBuilder();
		hcb.followRedirects(Redirect.ALWAYS);

		try (HttpClient cl = hcb.build()) {
			
				var accept = Stream.of(RDFFormat.TURTLE, RDFFormat.RDFXML).map(RDFFormat::getDefaultMIMEType)
						.collect(Collectors.joining(", "));
				HttpRequest hr = HttpRequest.newBuilder(new URI(endpoint))
						.setHeader("user-agent", "sparql-examples-utils-check-void").setHeader("accept", accept)
						.build();
				logger.info("Querying for VoID data at {} ", endpoint);
				BodyHandler<byte[]> buffering = BodyHandlers.buffering(BodyHandlers.ofByteArray(), 1024);
				HttpResponse<byte[]> send = cl.send(hr, buffering);
				if (send.statusCode() == 200) {
					List<String> contentTypes = send.headers().allValues("content-type");
					for (String ct : contentTypes) {
						var p = Rio.getParserFormatForMIMEType(ct);
						if (p.isPresent()) {
							RDFFormat format = p.get();
							Model model = Rio.parse(new ByteArrayInputStream(send.body()), format,
									SimpleValueFactory.getInstance().createIRI(endpoint));
							logger.info("VoID data for : {} triples: {}", endpoint, model.size());
							return model;
						}
					}
				}
			
		} catch (URISyntaxException e) {
			throw new IllegalStateException(e);
		}
		return new TreeModel();
	}
}
