# Comparing the JavaScript and Java diagrams

`compare.js` draws every query of a directory of SPARQL examples with the Java version (`SparqlInRdfToMermaid`) and
with the JavaScript version, compares the two, and checks the JavaScript diagrams with the real mermaid.
Run it when you change the JavaScript code, or the Java code that it follows.

```
cd js
npm install
npm run compare -- ~/git/sparql-examples/examples
```

It takes about a minute for the 1317 queries of [sparql-examples](https://github.com/sib-swiss/sparql-examples).
Use the directory with the `.ttl` files of the examples, not the directory above it, which also has files with all
the examples of a project in one file.

It needs:

- Java 25 and maven, to compile this project and run the Java version. Or give `--classpath` with the compiled classes
  and their dependencies, or `--reference` with the `java.jsonl` of an earlier run, and Java is not run.
- Node.js 22 or later, and a Chrome or Chromium for the mermaid check, which is found on the `PATH` or in the
  `CHROME` environment variable. `--mermaid none` skips the check.

Options: `--mermaid parse|render|none` (`parse` checks the syntax, `render` also lays out and draws every
diagram, which takes a few minutes), `--out <directory>`, `--verbose` to list all the queries that differ.
The exit code is 0 if all went well. The results are in `compare/out`: the diagrams of the Java version
(`java.jsonl`), those of the JavaScript version (`js.json`), what mermaid said (`mermaid.json`) and the log of Java.

## What is compared

**Triple patterns.** The two versions give different ids to the nodes and draw in a different order, so for each
edge the labels of the two nodes and of the edge are compared, as a set. This is what has to be the same, and the
run fails if it is not. Only escaped characters, the empty string and whether the language of a literal is in
capitals are not compared (see `triples.js`). A query is not compared when Java gives the same id to different
variables, which merges them in its own diagram. That is a mistake that was fixed, and the number has to be 0.

**Mermaid.** All the diagrams of both versions have to be valid mermaid. With `--mermaid render` they are also drawn.

**Other differences**, which are only listed: in the numbers of OPTIONAL, UNION, MINUS, SERVICE, FILTER, BIND, VALUES
and EXISTS in the diagram, in the variables that are green, and in the text of the filter, bind and values nodes.
For sparql-examples there are only 16 queries with other text, all of them numbers with a sign, which rdf4j and Traqula
read differently (`?x +1`, `-?x`), see the README of the project for these and the other known differences.
`NOT IN` is compared as the same text in both, as rdf4j can only draw it as `!=` and `&&`.
When there are more, look at why with `--verbose`.

## The cases

`compare/cases` has small examples, one for each of the mistakes that the comparison found in the Java version, and the
property paths, expressions and aggregates that rdf4j rewrites:

```
npm run compare -- compare/cases
```

All of them have to be the same in both versions, with no other differences. It needs no other examples and takes
less than a minute. Add a case when you find something that goes wrong.

The code that decides what is the same is in `triples.js` and `structure.js`, and is tested without Java or a
browser by `test/compare.test.js`.
