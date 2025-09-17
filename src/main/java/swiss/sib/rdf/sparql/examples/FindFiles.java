package swiss.sib.rdf.sparql.examples;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.Collections;
import java.util.stream.Stream;

public class FindFiles {

	public static Path base;
	public static Collection<Path> projects = Collections.emptyList();
	
	
	public static boolean isTurtleButNotPrefixFile(Path p) {
		return Files.exists(p) && Files.isRegularFile(p) && p.toUri().getPath().endsWith(".ttl")
				&& !p.toUri().getPath().endsWith("prefixes.ttl");
	}
	
	private static boolean isTurtleAndPrefixFile(Path p) {
		return Files.exists(p) && p.toUri().getPath().endsWith("prefixes.ttl")
				&& Files.isRegularFile(p);
	}

	/**
	 * Depends on global state: projects and base that should be set before.
	 * @return a stream of all SPARQL example files (turtle files except prefixes.ttl)
	 * @throws IOException if walking the file tree fails
	 */
	public static Stream<Path> sparqlExamples() throws IOException {
		if (projects.isEmpty()) {
			return sparqlExamples(getBasePath());
		} else {
			return projects.stream().flatMap(p -> {
				try {
					return sparqlExamples(p);
				} catch (IOException e) {
					throw new RuntimeException(e);
				}
			});
		}
	}
	
	public static Stream<Path> sparqlExamples(Path path) throws IOException {
		if (Files.isDirectory(path))
			return Files.list(path).sorted((a,b) -> a.getFileName().compareTo(b.getFileName())).filter(FindFiles::isTurtleButNotPrefixFile);
		else
			return Stream.empty();
	}

	public static Path getBasePath() {
		if (base == null) {
			base = Paths.get(System.getProperty(Tester.class.getName()));
		}
		return base;
	}

	public static Stream<Path> allPrefixFiles() throws IOException{
		return Files.walk(getBasePath()).filter(FindFiles::isTurtleAndPrefixFile);
	}

	public static Path commonPrefixes() throws URISyntaxException {
		return Paths.get(FindFiles.class.getResource("/prefixes.ttl").toURI());
	}

	public static Stream<Path> prefixFile(Path p) {
		return Stream.of(p.resolve("prefixes.ttl"));
	}
}
