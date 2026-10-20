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
run fails if it is not. The labels are made alike where the JavaScript version is meant to differ: the
modifiers of a property path, escaped characters, the empty string and language tagged literals (see `triples.js`).
A query is not compared when Java gives the same id to different variables, which merges them in its own diagram.

**Other differences**, in the numbers of OPTIONAL, UNION, MINUS, SERVICE, FILTER, BIND, VALUES and EXISTS in the
diagram, and in the variables that are green. These are only listed, as most are meant, see the README of the
project. For the examples of sparql-examples they are 74 queries with a different number of BIND nodes (Java draws
one for an aggregate in ORDER BY, for the template of CONSTRUCT and for DESCRIBE), 16 with other green variables, 18 with a
different number of filters, 7 with a different number of UNIONs, and 2 with a different number of EXISTS clauses. The
differences in the numbers of filters, UNIONs and EXISTS are all one of these three: Java draws everything in an EXISTS
twice (a filter, a UNION or an EXISTS in it, for example), Java leaves out a FILTER that is directly in an OPTIONAL, and Java
draws an empty UNION for a path ending in `?`. These were checked against the syntax tree of each query, which predicts them exactly.
When these numbers change, look at why with `--verbose`.

**Mermaid.** All the diagrams of the JavaScript version have to be fine for mermaid. Those of the Java version are
not, for example when an edge of an OPTIONAL has an IRI with a `.` in its label.

The code that decides what is the same is in `triples.js` and `structure.js`, and is tested without Java or a
browser by `test/compare.test.js`.
