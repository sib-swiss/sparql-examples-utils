#!/usr/bin/env node
/**
 * Compares the diagrams of the JavaScript version with those of the Java version, for all the queries of
 * a directory with SPARQL examples, and checks them with the real mermaid. See README.md in this directory.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { sparqlToMermaidLines } from '../src/index.js';
import { checkWithMermaid, mermaidUnavailable } from './mermaid.js';
import { differences } from './structure.js';
import { compareTriples, hasCollidingIds } from './triples.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '../..'); // the maven project, with the Java version

const USAGE = `usage: node compare/compare.js <directory with the sparql examples> [options]

  The directory is that of the .ttl files of the examples, for example sparql-examples/examples. Not the
  directory above, which also has files with all the examples of a project in one file.

  --out <directory>       where to write the results (default: compare/out)
  --mermaid <mode>        check the diagrams of the JavaScript version with the real mermaid, in a headless Chrome:
                          parse (default) checks the syntax, render also draws them (a few minutes), none skips it
  --reference <file>      use the dump of the Java version of an earlier run, and do not run Java
  --classpath <path>      class path with the compiled classes of this project and its dependencies,
                          instead of letting maven make it
  --verbose               list the queries that differ
`;

const { values: options, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		out: { type: 'string', default: path.join(here, 'out') },
		mermaid: { type: 'string', default: 'parse' },
		reference: { type: 'string' },
		classpath: { type: 'string' },
		verbose: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
});

if (options.help || (positionals.length !== 1 && !options.reference)) {
	console.log(USAGE);
	process.exit(options.help ? 0 : 2);
}
if (!['parse', 'render', 'none'].includes(options.mermaid)) {
	console.error(`--mermaid is parse, render or none, not ${options.mermaid}\n\n${USAGE}`);
	process.exit(2);
}
if (options.mermaid !== 'none' && mermaidUnavailable()) {
	console.error(`Can not check with mermaid: ${mermaidUnavailable()}.\nUse --mermaid none to compare only.`);
	process.exit(2);
}
fs.mkdirSync(options.out, { recursive: true });

// ---- the Java version

const referenceFile = options.reference ?? path.join(options.out, 'java.jsonl');
if (!options.reference) {
	const classpath = options.classpath ?? javaClasspath();
	console.log('Drawing the queries with the Java version ...');
	const run = spawnSync('java', ['-cp', classpath, path.join(here, 'Dump.java'), referenceFile, path.resolve(positionals[0])],
		{ encoding: 'utf8', maxBuffer: 1 << 30 });
	const log = path.join(options.out, 'java.log'); // Java logs every query that it can not draw
	fs.writeFileSync(log, run.stderr ?? '');
	if (run.status !== 0) {
		fail(`the Java version failed, see ${log}\n${(run.stderr ?? '').split('\n').slice(-8).join('\n')}`);
	}
	console.log('  ' + (run.stderr ?? '').trim().split('\n').filter((line) => line.startsWith('queries=')).join(''));
}
const queries = fs.readFileSync(referenceFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));

function javaClasspath() {
	console.log('Compiling this project with maven ...');
	const build = (...goals) => spawnSync('mvn', ['-q', '-B', ...goals], { cwd: project, stdio: ['ignore', 'inherit', 'inherit'] });
	const list = path.join(options.out, 'classpath.txt');
	if (build('compile').status !== 0 || build('dependency:build-classpath', `-Dmdep.outputFile=${list}`).status !== 0) {
		fail('maven failed, or give the class path with --classpath');
	}
	return path.join(project, 'target/classes') + path.delimiter + fs.readFileSync(list, 'utf8').trim();
}

function fail(message) {
	console.error(message);
	process.exit(1);
}

// ---- the JavaScript version, with the prefixes that the Java version used

const started = Date.now();
const js = queries.map((query) => {
	const prefixes = Object.fromEntries(query.prefixes.map(([namespace, label]) => [label.replace(/:$/, ''), namespace]));
	try {
		return { lines: sparqlToMermaidLines(query.query, { base: query.base, prefixes }) };
	} catch (error) {
		return { error: String(error.message).split('\n')[0] };
	}
});
const crashed = queries.flatMap((query, i) => (js[i].error ? [`${describe(query)}: ${js[i].error}`] : []));
fs.writeFileSync(path.join(options.out, 'js.json'), JSON.stringify(js));

// ---- the comparison

let identical = 0;
let skippedJavaMerges = 0;
let skippedJavaFailed = 0;
const tripleDifferences = [];
const otherDifferences = {};
queries.forEach((query, i) => {
	if (!js[i].lines) {
		return;
	}
	if (!query.lines) {
		skippedJavaFailed++;
		return;
	}
	for (const fact of differences(query.lines, js[i].lines)) {
		(otherDifferences[fact] ??= []).push(i);
	}
	if (hasCollidingIds(query.lines)) {
		skippedJavaMerges++;
		return;
	}
	const { onlyJava, onlyJs } = compareTriples(query.lines, js[i].lines);
	if (onlyJava.length || onlyJs.length) {
		tripleDifferences.push({ i, onlyJava, onlyJs });
	} else {
		identical++;
	}
});

console.log(`
${queries.length} queries, ${new Set(queries.map((query) => query.file)).size} files
JavaScript version: ${queries.length - crashed.length} of ${queries.length} drawn, in ${Date.now() - started} ms`);
crashed.slice(0, 10).forEach((message) => console.log('  failed: ' + message));
const compared = identical + tripleDifferences.length;
console.log(`
Triple patterns, ${compared} queries compared:
  ${identical} draw the same edges
  ${tripleDifferences.length} differ
  ${skippedJavaMerges} not compared, Java gives the same id to different variables and so merges them in its diagram
  ${skippedJavaFailed} not compared, Java could not draw them`);
for (const { i, onlyJava, onlyJs } of tripleDifferences.slice(0, options.verbose ? Infinity : 5)) {
	console.log(`  ${describe(queries[i])}\n    only Java: ${JSON.stringify(onlyJava.slice(0, 3))}\n    only JS:   ${JSON.stringify(onlyJs.slice(0, 3))}`);
}

console.log('\nOther differences, to look at when something changed. Most are meant, see the README:');
for (const [fact, indexes] of Object.entries(otherDifferences).sort((a, b) => b[1].length - a[1].length)) {
	console.log(`  ${fact.padEnd(12)} ${String(indexes.length).padStart(4)} queries${options.verbose ? ': ' + indexes.map((i) => describe(queries[i])).join(', ') : ''}`);
}
if (!Object.keys(otherDifferences).length) {
	console.log('  none');
}

// ---- mermaid

let mermaidFailures = [];
if (options.mermaid !== 'none') {
	console.log(`\nChecking the diagrams with mermaid (${options.mermaid}) ...`);
	const text = (lines) => ['graph TD', ...lines].join('\n');
	const diagrams = {};
	queries.forEach((query, i) => {
		if (query.lines) {
			diagrams[`java ${i}`] = text(query.lines);
		}
		if (js[i].lines) {
			diagrams[`js ${i}`] = text(js[i].lines);
		}
	});
	const results = await checkWithMermaid(diagrams, options.mermaid);
	fs.writeFileSync(path.join(options.out, 'mermaid.json'), JSON.stringify(results));
	for (const version of ['java', 'js']) {
		const mine = Object.entries(results).filter(([id]) => id.startsWith(version + ' '));
		const failing = mine.filter(([, problem]) => problem);
		console.log(`  ${version === 'js' ? 'JavaScript' : 'Java'} version: ${mine.length - failing.length} of ${mine.length} are fine`);
		for (const [id, problem] of failing.slice(0, options.verbose ? Infinity : 5)) {
			console.log(`    ${describe(queries[Number(id.split(' ')[1])])}: ${problem}`);
		}
		mermaidFailures.push(...failing);
	}
}

const ok = !crashed.length && !tripleDifferences.length && !mermaidFailures.length;
console.log(`\n${ok ? 'OK' : 'FAILED'}, results are in ${options.out}`);
process.exit(ok ? 0 : 1);

function describe(query) {
	return path.relative(process.cwd(), query.file) + ` (${query.type})`;
}
