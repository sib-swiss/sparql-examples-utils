package swiss.sib.rdf.sparql.examples;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.eclipse.rdf4j.model.BNode;
import org.eclipse.rdf4j.model.IRI;
import org.eclipse.rdf4j.model.Model;
import org.eclipse.rdf4j.model.ValueFactory;
import org.eclipse.rdf4j.model.impl.SimpleValueFactory;
import org.eclipse.rdf4j.model.impl.TreeModel;
import org.eclipse.rdf4j.model.vocabulary.RDF;
import org.eclipse.rdf4j.model.vocabulary.RDFS;
import org.eclipse.rdf4j.model.vocabulary.SHACL;
import org.eclipse.rdf4j.query.parser.ParsedQuery;
import org.eclipse.rdf4j.query.parser.QueryParserUtil;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.QueryLanguage;
import org.eclipse.rdf4j.rio.RDFFormat;
import org.eclipse.rdf4j.rio.RDFHandlerException;
import org.eclipse.rdf4j.rio.Rio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import picocli.CommandLine;
import picocli.CommandLine.Model.CommandSpec;
import picocli.CommandLine.Option;
import picocli.CommandLine.Spec;
import swiss.sib.rdf.sparql.examples.vocabularies.SIB;
import swiss.sib.rdf.sparql.examples.vocabularies.SchemaDotOrg;

@CommandLine.Command(name = "import-github-issue", description = "Import SPARQL examples from GitHub issue markdown files")
public class ImportFromGitHubIssue implements Callable<Integer> {
    private static final Logger log = LoggerFactory.getLogger(ImportFromGitHubIssue.class);
    private static final ValueFactory VF = SimpleValueFactory.getInstance();

    @Spec
    CommandSpec spec;

    @Option(names = { "-i",
            "--input-directory" }, paramLabel = "directory containing example files to import", description = "The root directory where the examples and their prefixes can be found.", required = true)
    private Path inputDirectory;

    @Option(names = { "-b",
            "--base" }, required = false, description = "The base URI for the examples. e.g. https://purl.example.org/.well-known/sparql-examples/. If not provided, will be extracted from existing .ttl files in the output directory.")
    private String base;

    @Option(names = { "-t", "--tmp-folder" }, required = false, description = "The name of the temporary folder to create for testing. If not provided, no temporary folder will be created.")
    private String tmpFolder;

    @Option(names = { "-h", "--help" }, usageHelp = true, description = "display this help message")
    private boolean usageHelpRequested;

    private static final BNode PREFIXES_BNODE = VF.createBNode("sparql_examples_prefixes");

    public Integer call() {
        CommandLine commandLine = spec.commandLine();
        if (commandLine.isUsageHelpRequested()) {
            commandLine.usage(System.out);
        } else if (commandLine.isVersionHelpRequested()) {
            commandLine.printVersionHelp(System.out);
        } else {
            try {
                processGitHubIssue();
            } catch (IOException e) {
                log.error("Can't read input directory", e);
                return Failure.CANT_READ_INPUT_DIRECTORY.exitCode();
            } catch (NeedToStopException e) {
                log.error("{}", e.getMessage());
                return e.getFailure().exitCode();
            }
        }
        return 0;
    }

    private void processGitHubIssue() throws IOException {
        String content = System.getenv("GITHUB_ISSUE_BODY");
        if (content == null || content.trim().isEmpty()) {
            throw new NeedToStopException(
                    new IllegalArgumentException("GITHUB_ISSUE_BODY environment variable is not set or is empty"),
                    Failure.CANT_READ_INPUT_DIRECTORY);
        }

        // Extract information from the issue
        String sparqlQuery = extractSection(content, "SPARQL query").trim();
        // Remove surrounding ```sparql ... ``` if present
        if (sparqlQuery.startsWith("```") && sparqlQuery.endsWith("```")) {
            sparqlQuery = sparqlQuery.substring(sparqlQuery.indexOf('\n') + 1, sparqlQuery.lastIndexOf("```")).trim();
        }
        String description = extractSection(content, "Query description");
        String filePath = extractSection(content, "Query file path");
        List<String> targetEndpoints = extractTargetEndpoints(content);
        List<String> keywords = extractKeywords(content);
        Path outputFilePath = inputDirectory.resolve(filePath);
        generateExampleTtl(sparqlQuery, description, targetEndpoints, keywords, outputFilePath);
    }

    private String extractSection(String content, String sectionName) {
        Pattern pattern = Pattern.compile("### " + Pattern.quote(sectionName) + "\\s*\\n(.*?)(?=### |$)",
                Pattern.DOTALL);
        Matcher matcher = pattern.matcher(content);
        if (matcher.find()) {
            String sectionContent = matcher.group(1).trim();
            // Remove empty lines and clean up
            return Arrays.stream(sectionContent.split("\n"))
                    .filter(line -> !line.trim().isEmpty())
                    .collect(Collectors.joining("\n"));
        }
        return "";
    }

    private List<String> extractTargetEndpoints(String content) {
        List<String> endpoints = new ArrayList<>();
        // Get target endpoints from the checbox list
        String endpointSection = extractSection(content, "Select the target SPARQL endpoint(s)");
        for (String line : endpointSection.split("\n")) {
            if (line.startsWith("- [x] ")) {
                endpoints.add(line.substring("- [x] ".length()).trim());
            }
        }
        // Check for custom endpoints
        String customEndpoint = extractSection(content, "Custom SPARQL Endpoints");
        if (customEndpoint != null && !customEndpoint.trim().isEmpty() && !customEndpoint.contains("_No response_")) {
            // Handle comma-separated list of endpoints
            String[] customEndpoints = customEndpoint.split("\n");
            for (String endpoint : customEndpoints) {
                endpoints.add(endpoint.trim());
            }
        }
        return endpoints;
    }

    private List<String> extractFederatedServices(String sparqlQuery) {
        List<String> services = new ArrayList<>();
        if (sparqlQuery == null || sparqlQuery.trim().isEmpty()) {
            return services;
        }
        ParsedQuery parsedQuery = QueryParserUtil.parseQuery(QueryLanguage.SPARQL, sparqlQuery, null);
        // Create a visitor to extract SERVICE clauses
        ServiceExtractorVisitor visitor = new ServiceExtractorVisitor();
        parsedQuery.getTupleExpr().visit(visitor);
        services.addAll(visitor.getServices());
        return services;
    }

    /**
     * Visitor to extract SERVICE endpoints from SPARQL queries
     */
    private static class ServiceExtractorVisitor extends AbstractQueryModelVisitor<RuntimeException> {
        private final List<String> services = new ArrayList<>();

        @Override
        public void meet(Service service) throws RuntimeException {
            if (service.getServiceRef() instanceof Var) {
                Var serviceVar = (Var) service.getServiceRef();
                if (serviceVar.hasValue() && serviceVar.getValue() instanceof IRI) {
                    services.add(((IRI) serviceVar.getValue()).stringValue());
                }
            }
            super.meet(service);
        }

        public List<String> getServices() {
            return services;
        }
    }

    private List<String> extractKeywords(String content) {
        List<String> keywords = new ArrayList<>();
        String keywordsSection = extractSection(content, "Keywords");
        if (keywordsSection != null && !keywordsSection.trim().isEmpty()) {
            String[] lines = keywordsSection.split("\n");
            for (String line : lines) {
                String keyword = line.trim();
                if (!keyword.isEmpty()) {
                    keywords.add(keyword);
                }
            }
        }
        return keywords;
    }

    private IRI determineQueryType(String sparqlQuery) throws IOException {
        if (sparqlQuery == null || sparqlQuery.trim().isEmpty()) {
            throw new IOException("SPARQL query cannot be null or empty");
        }
        ParsedQuery parsedQuery = QueryParserUtil.parseQuery(QueryLanguage.SPARQL, sparqlQuery, null);
        if (parsedQuery instanceof org.eclipse.rdf4j.query.parser.ParsedBooleanQuery) {
            return SHACL.ASK;
        } else if (parsedQuery instanceof org.eclipse.rdf4j.query.parser.ParsedTupleQuery) {
            return SHACL.SELECT;
        } else if (parsedQuery instanceof org.eclipse.rdf4j.query.parser.ParsedGraphQuery) {
            // Check if it's CONSTRUCT or DESCRIBE
            String queryStr = sparqlQuery.toUpperCase().trim();
            if (queryStr.contains("CONSTRUCT")) {
                return SHACL.CONSTRUCT;
            } else if (queryStr.contains("DESCRIBE")) {
                return SIB.DESCRIBE;
            }
        }
        throw new IOException("Could not determine SPARQL query type from query: " + sparqlQuery);
    }

    /**
     * Extract the base namespace from existing .ttl files in the output directory
     */
    private String extractBaseFromExistingFiles(Path outputDirectory) throws IOException {
        if (!Files.exists(outputDirectory)) {
            return null;
        }
        // Find all .ttl files in the directory, excluding prefixes.ttl
        List<Path> ttlFiles = Files.list(outputDirectory)
                .filter(path -> path.toString().endsWith(".ttl"))
                .filter(path -> !path.getFileName().toString().equals("prefixes.ttl"))
                .collect(Collectors.toList());
        if (ttlFiles.isEmpty()) {
            return null;
        }
        // Read the first .ttl file and extract the ex: prefix namespace
        Path firstTtlFile = ttlFiles.get(0);
        List<String> lines = Files.readAllLines(firstTtlFile);
        for (String line : lines) {
            line = line.trim();
            if (line.startsWith("@prefix ex:")) {
                // Extract the namespace between < and >
                int startIndex = line.indexOf('<');
                int endIndex = line.indexOf('>', startIndex);
                if (startIndex != -1 && endIndex != -1) {
                    return line.substring(startIndex + 1, endIndex);
                }
            }
        }
        return null;
    }

    /**
     * Generate a turtle file from the extracted information
     */
    public void generateExampleTtl(String sparqlQuery, String description,
            List<String> endpoints, List<String> keywords, Path outputFilePath) throws IOException {
        String fileName = outputFilePath.getFileName().toString();
        String queryId = fileName.substring(0, fileName.lastIndexOf('.'));
        Path outputFile = outputFilePath.getParent().resolve(queryId + ".ttl");
        Files.createDirectories(outputFile.getParent());

        // Determine the base namespace to use
        String baseNamespace = base;
        if (baseNamespace == null || baseNamespace.trim().isEmpty()) {
            baseNamespace = extractBaseFromExistingFiles(outputFile.getParent());
            if (baseNamespace == null) {
                throw new IllegalArgumentException(
                        "No base namespace provided and no existing .ttl files found to extract namespace from. Please provide the --base parameter.");
            }
        }
        Model model = new TreeModel();
        model.setNamespace("ex", baseNamespace);
        model.setNamespace(SHACL.NS);
        model.setNamespace(RDF.NS);
        model.setNamespace(RDFS.NS);
        model.setNamespace(SchemaDotOrg.NS);
        model.setNamespace(SIB.NS);

        IRI exampleIRI = VF.createIRI(baseNamespace + queryId);
        IRI queryType = determineQueryType(sparqlQuery);
        model.add(VF.createStatement(exampleIRI, RDF.TYPE, SHACL.SPARQL_EXECUTABLE));

        // Add query type
        if (queryType.equals(SHACL.SELECT)) {
            model.add(VF.createStatement(exampleIRI, RDF.TYPE, SHACL.SPARQL_SELECT_EXECUTABLE));
        } else if (queryType.equals(SHACL.ASK)) {
            model.add(VF.createStatement(exampleIRI, RDF.TYPE, SHACL.SPARQL_ASK_EXECUTABLE));
        } else if (queryType.equals(SHACL.CONSTRUCT)) {
            model.add(VF.createStatement(exampleIRI, RDF.TYPE, SHACL.SPARQL_CONSTRUCT_EXECUTABLE));
        } else if (queryType.equals(SIB.DESCRIBE)) {
            model.add(VF.createStatement(exampleIRI, RDF.TYPE, SIB.SPARQL_DESCRIBE_EXECUTABLE));
        }
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Query description cannot be empty or null");
        }
        // Add other properties
        model.add(VF.createStatement(exampleIRI, RDFS.COMMENT, VF.createLiteral(description, RDF.HTML)));
        model.add(VF.createStatement(exampleIRI, SHACL.PREFIXES, PREFIXES_BNODE));
        model.add(VF.createStatement(exampleIRI, queryType, VF.createLiteral(sparqlQuery)));
        for (String endpoint : endpoints) {
            if (endpoint != null && !endpoint.trim().isEmpty()) {
                model.add(VF.createStatement(exampleIRI, SchemaDotOrg.TARGET, VF.createIRI(endpoint)));
            }
        }
        List<String> federatedServices = extractFederatedServices(sparqlQuery);
        for (String service : federatedServices) {
            model.add(VF.createStatement(exampleIRI, SIB.FEDERATES_WITH, VF.createIRI(service)));
        }
        for (String keyword : keywords) {
            model.add(VF.createStatement(exampleIRI, SchemaDotOrg.KEYWORDS, VF.createLiteral(keyword)));
        }

        // Write example query RDF to file
        try (OutputStream out = Files.newOutputStream(outputFile, StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING)) {
            Rio.write(model, out, RDFFormat.TURTLE);
        } catch (RDFHandlerException | IOException e) {
            throw new NeedToStopException(e, Failure.CANT_WRITE_FIXED_EXAMPLE);
        }

        // Create a temporary directory and file for testing if tmp folder is specified
        if (tmpFolder != null && !tmpFolder.trim().isEmpty()) {
            Path tmpDir = inputDirectory.resolve(tmpFolder);
            Files.createDirectories(tmpDir);
            Path tmpFile = tmpDir.resolve(queryId + ".ttl");
            try (OutputStream out = Files.newOutputStream(tmpFile, StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING)) {
                Rio.write(model, out, RDFFormat.TURTLE);
            } catch (RDFHandlerException | IOException e) {
                throw new NeedToStopException(e, Failure.CANT_WRITE_FIXED_EXAMPLE);
            }
        }
        System.out.println("output_file=" + outputFile);
        System.out.println("query_description=" + description);
    }
}
