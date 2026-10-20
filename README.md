# SPARQL examples testing and conversion utilities

This is a set of tools to convert, test and help maintain SPARQL query examples.

*Minimum:* Java version is JDK 25


The code comes from the [SIB SPARQL Examples](https://github.com/sib-swiss/sparql-examples/) project.

For this code to work each query should be in a turtle file.

Each SPARQL query is itself in a turtle file. We use the following ontologies for the basic concepts.

* ShACL for the relation to the text of the Select/Ask queries, and declaring prefixes
* RDFS for comments and labels as shown in the user interfaces
* RDF for basic type relations
* schema.org for the target SPARQL endpoint and tagging relevant keywords

The following illustrates an example to retrieve all taxa from the UniProt SPARQL endpoint.

```sparql
prefix ex: <https://sparql.uniprot.org/.well-known/sparql-examples/>  # <!-- change per dataset
prefix sh: <http://www.w3.org/ns/shacl#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs:<http://www.w3.org/2000/01/rdf-schema#>
ex:1  # <!-- UniProt, Rhea and Swiss-Lipids are numbered but this can be anything.
    a sh:SPARQLSelectExecutable, sh:SPARQLExecutable ;
    sh:prefixes _:sparql_examples_prefixes ; # <!-- required for the import of the prefix declarations. Note the blank node
    rdfs:comment """A comment <em>May have HTML in them</em>. Example: Select all taxa from the <a href=\"https://www.uniprot.org/taxonomy/\">UniProt taxonomy</a>"""^^rdf:HTML ;
    sh:select """PREFIX up: <http://purl.uniprot.org/core/>

SELECT ?taxon
FROM <http://sparql.uniprot.org/taxonomy>
WHERE
{
    ?taxon a up:Taxon .
}""" ;
    schema:target <https://sparql.uniprot.org/sparql/> ;
    schema:keywords "taxa".
```

If you want to add a label to a query please use the [schema.org keywords](https://schema.org/keywords).

## Running the code

If using a release:

```bash
mkdir target
wget "https://github.com/sib-swiss/sparql-examples-utils/releases/download/v2.0.10/sparql-examples-utils-2.0.10-uber.jar"
mv sparql-examples-utils-2.0.10-uber.jar target

# This target directory is only so that the commands in the examples match as if the code was build locally.
# basically target/ can be remove from all examples below
```

If building locally in this git repository:

```bash
mvn package
```


## Quality Assurance (QA)

To test your examples pass the folder/directory containing your examples as an argument (`--input-directory` to the `test` subcommand, e.g.:

```bash
java -jar target/sparql-examples-utils-*-uber.jar test --input-directory=../sparql-examples/examples
```

The queries can be executed automatically on all endpoints they apply to using an extra argument for the test `--also-run-slow-tests`. This does change the queries to add a `LIMIT 1` if no limit was set in the query.

```bash
java -jar target/sparql-examples-utils-*-uber.jar test --input-directory=../sparql-examples/examples -p MetaNetX --also-run-slow-tests
```

### Using VoID data

We recommend that SPARQL endpoints describe their data using VoID, in their service description.
This can be run with.

```bash
java -jar target/sparql-examples-utils-*-uber.jar test --input-directory=../sparql-examples/examples -p UniProt --also-run-void-check
```

### Using Python/RDFlib

The queries can also be tested with the [Python RDFlib](https://rdflib.readthedocs.io/en/stable/) this is done in Java using the [Graal Python](https://www.graalvm.org/python/docs/) implementation. If not running on a Graal/Truffle enabled JVM this is very, very slow. However, it is fully functional. Which is why it is hidden behind a flag `--also-run-python-tests`.

```bash
java -jar target/sparql-examples-utils-*-uber.jar test --input-directory=../sparql-examples/examples -p MetaNetX --also-run-python-tests
```

> [!NOTE]
>
> All CLI commands provided in this readme expects you have the [`sparql-examples`](https://github.com/sib-swiss/sparql-examples) folder cloned in the same directory alongside this `sparql-examples-utils` project folder. Feel free to change them for your own example folder and path.

## Conversion for upload in SPARQL endpoint

Before loading the examples into a SPARQL endpoint they should be concatenated into one file, including the prefixes/namespaces definitions.

Compile all query files for a specific example subfolder, into a local turtle file:

```bash
java -jar target/sparql-examples-utils-*-uber.jar convert -i ../sparql-examples/examples -p Bgee -f ttl > examples_Bgee.ttl
```

Or compile all subfolders as JSON-LD to the standard output:

```bash
java -jar target/sparql-examples-utils-*-uber.jar convert -i ../sparql-examples/examples -p all -f jsonld
```

## Conversion to RQ files

For easier use by other tools we can also generate [`.rq`](https://www.w3.org/TR/2013/REC-sparql11-query-20130321/#mediaType) files. Following the syntax of [grlc.io](https://grlc.io/) allowing to use these queries as HTTP APIs.
```bash
java -jar target/sparql-examples-utils-*-uber.jar convert -i ../sparql-examples/examples -p all -r
```

## Conversion from RQ files

If you already have a set of sparql examples in `*.rq` files then you can generate `*.ttl` files with:

```bash
java -jar target/sparql-examples-utils-*-uber.jar import-rq -i ../${DIRECTORY_WITH_EXAMPLES_IN_RQ_FILES} -b ${BASE_IRI}
```

You can specify an output folder with:

```bash
java -jar target/sparql-examples-utils-*-uber.jar import-rq -i ../${DIRECTORY_WITH_EXAMPLES_IN_RQ_FILES} -b ${BASE_IRI} -o ./output
```

This attempts to extract metadata as expressed using the [grlc.io](https://grlc.io) approach. Prefixes are collected as map, which might lead to issues if they are not unique in the set. Warnings are emitted for duplicated prefixes or namespaces.

The base IRI should be the space where you will store the examples and where they can be dereferenced.

To provide metadata about your query, create a comment starting with `#+` and followed by the field to define:

```SPARQL
#+ endpoint: https://sparql.uniprot.org/sparql
#+ summary: Get list of species
#+ tags:
#+ - species
#+ - taxon
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
```

You can also provide multiple endpoints separated by commas if the query targets multiple endpoints:

```SPARQL
#+ endpoint: https://sparql.uniprot.org/sparql, https://www.bgee.org/sparql/
#+ summary: Get list of species
#+ tags: species, taxon
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
```


## Generate markdown file

Generate markdown files with the query and a mermaid diagram of the queries, to be used to deploy a static website for the query examples.

```bash
java -jar target/sparql-examples-utils-*-uber.jar convert -i ../sparql-examples/examples -m
```

## Querying for queries

As the SPARQL examples are themselves RDF, they can be queried for as soon as they are loaded in a SPARQL endpoint.
```sparql
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX spex: <https://purl.expasy.org/sparql-examples/ontology#>
SELECT DISTINCT ?sq ?comment ?query
WHERE {
    ?sq a sh:SPARQLExecutable ;
        rdfs:comment ?comment ;
        sh:select|sh:ask|sh:construct|spex:describe ?query .
} ORDER BY ?sq
```

## Finding queries that run on more than one endpoint

```bash
java -jar target/sparql-examples-utils-*-uber.jar convert --input-directory ../sparql-examples/examples > examples_all.ttl

sparql --data examples_all.ttl "SELECT ?query (GROUP_CONCAT(?target ; separator=', ') AS ?targets) WHERE { ?query <https://schema.org/target> ?target } GROUP BY ?query HAVING (COUNT(DISTINCT ?target) > 1) "
```

## Native executable

The project is ready to be compiled by the native-image tool of the [GraalVM](https://www.graalvm.org/) project.

To do so set your `JAVA_HOME` to the graalvm location and user maven package -Pnative

e.g. on linux with graalvm installed in your `$HOME/bin` directory:
```bash
export JAVA_HOME=$HOME/bin/graalvm-jdk-${GRAALVM_VERSION}
mvn package -Pnative

# Then there is now a local native binary that you can use to convert all entries
./target/sparql-examples-utils converter -i ${DIRECTORY_WITH_EXAMPLES}
```

## How to cite this work

If you reuse any part of this work, please cite [the arXiv paper](http://arxiv.org/abs/2410.06010):

```
@misc{largecollectionsparqlquestionquery,
      title={A large collection of bioinformatics question-query pairs over federated knowledge graphs: methodology and applications},
      author={Jerven Bolleman and Vincent Emonet and Adrian Altenhoff and Amos Bairoch and Marie-Claude Blatter and Alan Bridge and Severine Duvaud and Elisabeth Gasteiger and Dmitry Kuznetsov and Sebastien Moretti and Pierre-Andre Michel and Anne Morgat and Marco Pagni and Nicole Redaschi and Monique Zahn-Zabal and Tarcisio Mendes de Farias and Ana Claudia Sima},
      year={2024},
      doi={10.48550/arXiv.2410.06010},
      eprint={2410.06010},
      archivePrefix={arXiv},
      primaryClass={cs.DB},
      url={https://arxiv.org/abs/2410.06010},
}
```


## Extracting queries from wikibase

These utils have a mode to extract queries from wikibase instances.

For example to extract the queries from factgrid into a separate example
directory.

```sh
java -jar target/sparql-examples-utils-*-uber.jar \
    wikibase \
    -e YOUR@EMAIL.real \
    -o $HOME/git/wikibase-sparql-examples/examples/FactGrid \
    -s https://database.factgrid.de/sparql \
    -u https://database.factgrid.de/
```


# Next release

Make sure JavaDoc has no ERRORs
```
mvn org.apache.maven.plugins:maven-javadoc-plugin:3.11.2:jar
```

Prepare release, remember tag starts with 'v' e.g. 'v2.0.12'


```
mvn release:prepare
mvn release:perform
```

# SPARQL as a mermaid diagram in JavaScript

The `js` directory has a JavaScript version of the mermaid diagrams that `SparqlInRdfToMermaid` makes in Java.
It uses the [Traqula](https://github.com/comunica/traqula) SPARQL 1.1 parser of Comunica. It runs in Node, with no
build step and no Java. It uses no Node APIs, and bundles with esbuild in the same way as the parser below
(`npx esbuild src/index.js --bundle --format=iife --global-name=SparqlToMermaid`), which is what is needed to
run it in a browser or in Graal.js.

```
cd js
npm install
npm test
```

```js
import { sparqlToMermaid } from './src/index.js';

const diagram = sparqlToMermaid(`
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  SELECT ?category ?label WHERE {
    ?category rdfs:subClassOf* ?parent .
    OPTIONAL { ?category rdfs:label ?label }
  }`);
```

It can also draw the query as SVG itself, without mermaid, laid out with [ELK](https://eclipse.dev/elk/):

```js
import { sparqlToSvg } from './src/svg-index.js';

const svg = await sparqlToSvg(query, { prefixes });
```

ELK lays out the boxes of OPTIONAL, UNION, MINUS, SERVICE and EXISTS properly: a variable is drawn in the innermost box
that has all its edges, so a variable that is also used outside an OPTIONAL is drawn outside it, where mermaid draws
it in the first box that mentions it. A UNION of more than two is one box, and a VALUES or IN with many values shows the
first 6 (option `maxValues`). The options of `sparqlToSvg` are those of `sparqlToMermaid`, and `measure` (the width of
text, the default is an estimate for Helvetica and Arial, in a browser pass `measureWithCanvas(DEFAULT_THEME.fontFamily)`),
`theme` (colours and fonts, see `src/theme.js`), `layoutOptions` (of ELK, e.g. `{ 'elk.direction': 'RIGHT' }`),
`maxValues`, `idPrefix` and `title`. `sparqlToElk` gives the input of the ELK layout, to draw it in another way, and
`sparqlToGraph` (in `src/index.js`) the diagram as a tree of nodes, edges and groups, that both are made from.
`npm run build:demo` bundles it for a browser (1.7 MB, 0.5 MB gzipped, mostly ELK); `demo/index.html` then draws
a query as you type it.

`sparqlToMermaid(query, options)` gives the text of the diagram, and `sparqlToMermaidLines` the same without its
first line `graph TD`, to put several queries in one diagram. The options are `prefixes`, a `{ prefix: namespace }`
object or `Map` that is used to shorten IRIs (the default is the `PREFIX` declarations of the query, and `rdf`, `rdfs`,
`owl`, `xsd` and `fn`; where namespaces overlap the longest that matches is used, so `cv:DO-00100` rather than
`:terminology/DO-00100`, in the Java version as well), and `base`
for relative IRIs, which are resolved with the `URL` of the platform and are drawn as written where there is none.
A query that is not valid SPARQL 1.1 throws. The queries have to declare their prefixes, except `rdf`, `rdfs`, `owl`,
`xsd` and `fn`, as with the Java version, whose parser allows those.

The diagram looks as in Java: variables, blank nodes and constants are nodes, triple patterns are labelled edges,
the variables that are selected are green, and OPTIONAL, UNION, MINUS and SERVICE are subgraphs. FILTER, BIND and
VALUES are nodes that are linked to the variables they use.

The Java code walks the algebra of rdf4j, where the JavaScript code walks the syntax tree of Traqula, so there are
some differences. It was compared with the Java version on the 1317 queries of
[sparql-examples](https://github.com/sib-swiss/sparql-examples). The triple patterns are drawn as the same edges in
all of the 1247 queries where the Java diagram is itself correct. In the other 70, Java gives the same id to
different variables when a query has a BIND or `(expression AS ?variable)`, which merges them in the diagram.
The JavaScript version differs from Java where rdf4j's rewriting of the query showed:

- Every label is quoted and escaped. In Java 93 of the diagrams are not valid mermaid, for example
  dotted edges of an OPTIONAL with an IRI that has a `.`, language tagged literals (which lost their opening
  quote), and empty strings. All of the JavaScript diagrams parse and render in mermaid 11.
- Every edge in an OPTIONAL is dotted, Java only did that for the first.
- `*`, `+`, `?` and `!` of a property path are in the label of the edge, as in `"rdfs:subClassOf*"`.
  Java drew an edge without them, or for `?` an empty UNION.
- The alternatives of a UNION are drawn in the order of the query.
- EXISTS and NOT EXISTS are drawn once. Java also drew the triple patterns in them in the main diagram. A FILTER
  in an OPTIONAL is drawn, Java left it out. HAVING is a filter.
- A variable that is selected but not used in the query is drawn, and the described resource of DESCRIBE.
  ORDER BY, GROUP BY and the template of CONSTRUCT are not drawn, and neither does anything of rdf4j's internal
  variables, such as `_anon_having_...` and `_describe_...`, show up.
- `count(distinct ?x)` shows the `distinct`, and an expression is shown in full, including aggregates in it.

`npm run compare` repeats this comparison, see `js/compare/README.md`.

The part of `SparqlInRdfToMermaid` that finds the queries in the RDF of the examples, and their prefixes, is not
translated. That needs an RDF parser, and `sparqlToMermaid` takes the query and its prefixes directly.

# Updating the JS|TS Traqula SPARQL parser

This is a SPARQL parser used by Comunica. We build a single function that we can easily access via Graal.js to use this in our tests.

```
mkdir tmp
cd tmp
npm install @traqula/parser-sparql-1-1
npx esbuild @traqula/parser-sparql-1-1 --bundle --format=iife --global-name=Traqula --outfile=../src/main/resources/traqula-parser.js
cd ../tmp
rm -rf tmp
```
