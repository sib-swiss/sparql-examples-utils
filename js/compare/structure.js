/**
 * Facts about a diagram, other than its triple patterns, to see where the Java and JavaScript versions differ.
 * Some differences are meant, see the README: HAVING, EXISTS, ORDER BY, property paths ending in ? and so on.
 */

/** @param {string[]} lines the lines of a diagram, without its first line */
export function structure(lines) {
	const trimmed = lines.map((line) => line.trim());
	const count = (pattern) => trimmed.filter((line) => pattern.test(line)).length;
	// the Java version draws VALUES as a bind node, the JavaScript version as a values node
	const javaValues = count(/^\S*bind\d+\[\/"?VALUES /);
	const values = javaValues + count(/^\S*values\d+\[\/"?VALUES /);
	return {
		// by the title or the style of the subgraph, not by its id, which has a prefix inside an EXISTS clause
		optional: count(/^subgraph \S+\["\(optional\)"\]/),
		union: count(/^subgraph \S+\[" Union "\]/),
		minus: count(/^subgraph \S+\["MINUS"\]/),
		service: count(/^style \S+ stroke-width:4px;$/),
		filters: count(/^\S*f\d+\[\[/),
		binds: count(/^\S*bind\d+\[\//) - javaValues,
		values,
		exists: count(/^subgraph \S+\["(Not )?Exists Clause"\]/),
	};
}

/**
 * The names of the variables that are green in the diagram, not counting those in an EXISTS clause,
 * whose ids contain e<number>v<number>.
 */
export function highlighted(lines) {
	return lines
		.map((line) => /^\s*(\S+?)\("\??([^"]*)"\):::projected/.exec(line))
		.filter((match) => match && !/e\d+v\d+$/.test(match[1]))
		.map((match) => match[2])
		.sort()
		.join(',');
}

const unescape = (text) => text.replace(/#quot;/g, '"').replace(/#lt;/g, '<').replace(/#gt;/g, '>')
	.replace(/#91;/g, '[').replace(/#93;/g, ']').replace(/#96;/g, '`');

// rdf4j has no NOT IN, it turns ?x NOT IN (a, b) into ?x != a && ?x != b. So both are the same text.
const NOT_EQUALS = String.raw`(\?\w+) != '[^']*'(?: && \1 != '[^']*')+`;
const notIn = (text) => text.replace(new RegExp(String.raw`\(${NOT_EQUALS}\)`, 'g'), '$1 not in')
	.replace(new RegExp(NOT_EQUALS, 'g'), '$1 not in');

/**
 * The text of the filter, bind and values nodes of a diagram, as a sorted list.
 * @param {string[]} lines the lines of a diagram, without its first line
 */
export function nodeTexts(lines) {
	return lines
		.map((line) => /^\s*\S*(?:f\d+\[\["(.*)"\]\]|bind\d+\[\/"(.*)"\/\]|values\d+\[\/"(.*)"\/\])$/.exec(line))
		.filter(Boolean)
		.map((match) => notIn(unescape(match[1] ?? match[2] ?? match[3])))
		.sort();
}

/** @returns {string[]} the names of the facts that differ */
export function differences(javaLines, jsLines) {
	const java = structure(javaLines);
	const js = structure(jsLines);
	const differing = Object.keys(java).filter((fact) => java[fact] !== js[fact]);
	if (highlighted(javaLines) !== highlighted(jsLines)) {
		differing.push('highlighted');
	}
	if (nodeTexts(javaLines).join('\n') !== nodeTexts(jsLines).join('\n')) {
		differing.push('texts');
	}
	return differing;
}
