import { Parser } from '@traqula/parser-sparql-1-1';
import { ExpressionPrinter } from './expression.js';
import { DEFAULT_PREFIXES, Iris } from './iris.js';
import { constantKey } from './labels.js';
import { toMermaidLines } from './mermaid.js';
import { inScopeVariables, Renderer, variablesOf } from './renderer.js';

let parser;

/**
 * Draws a SPARQL query as a mermaid flowchart, see https://mermaid.js.org
 *
 * Variables, blank nodes and constants are nodes, triple patterns are labelled edges.
 * OPTIONAL, UNION, MINUS and SERVICE are subgraphs. FILTER, BIND and VALUES are nodes
 * linked to the variables they use. Variables that the query selects are green.
 *
 * @param {string} query the SPARQL query, which has to declare the prefixes it uses, except rdf, rdfs, owl,
 *        xsd and fn
 * @param {object} [options]
 * @param {Record<string,string>|Map<string,string>} [options.prefixes] prefix label to namespace.
 *        IRIs in these namespaces are drawn as `prefix:local`. Defaults to the PREFIX
 *        declarations of the query, and rdf, rdfs, owl, xsd and fn.
 * @param {string} [options.base] used to resolve relative IRIs, unless the query has a BASE
 * @returns {string} the diagram
 * @throws when the query is not valid SPARQL 1.1
 */
export function sparqlToMermaid(query, options = {}) {
	return ['graph TD', ...sparqlToMermaidLines(query, options)].join('\n');
}

/**
 * As {@link sparqlToMermaid}, but gives the lines of the diagram without its first line `graph TD`.
 * That is what is needed to put several queries in one diagram.
 *
 * @returns {string[]}
 */
export function sparqlToMermaidLines(query, options = {}) {
	return toMermaidLines(sparqlToGraph(query, options));
}

/**
 * The diagram of a query as a tree of nodes, edges and groups, to draw it in another way than with mermaid.
 * See graph.js for what is in it. Takes the same options as {@link sparqlToMermaid}.
 *
 * @returns {import('./graph.js').Graph}
 */
export function sparqlToGraph(query, options = {}) {
	parser ??= new Parser();
	const ast = parser.parse(query, { prefixes: { ...DEFAULT_PREFIXES } }); // a copy, the parser adds the declarations to it
	const iris = new Iris(ast, options);
	const renderer = new Renderer(iris, projectionOf(ast, iris));
	renderer.renderQuery(ast);
	return renderer.graph();
}

/**
 * Which variables and constants are green in the diagram.
 *
 * As in the Java version, the variables an expression `(expression AS ?alias)` is made of
 * are green, and the alias is not.
 */
function projectionOf(ast, iris) {
	const projection = { names: new Set(), constants: new Set() };
	switch (ast.subType) {
		case 'select':
		case 'describe':
			for (const variable of ast.variables ?? []) {
				if (variable.type === 'wildcard') {
					inScopeVariables(ast.where ? [ast.where] : []).forEach((name) => projection.names.add(name));
				} else if (variable.subType === 'bind') {
					const printer = new ExpressionPrinter(iris);
					printer.print(variable.expression);
					printer.variables.forEach((name) => projection.names.add(name));
				} else if (variable.subType === 'variable') {
					projection.names.add(variable.value);
				} else if (variable.subType === 'namedNode') {
					projection.constants.add(constantKey(variable, iris));
				}
			}
			break;
		case 'construct':
			variablesOf(ast.template).forEach((name) => projection.names.add(name));
			break;
		default: // ASK
	}
	return projection;
}
