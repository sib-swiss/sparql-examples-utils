import { XSD } from './iris.js';

/**
 * Text that is safe inside a double quoted mermaid label. Mermaid has no
 * backslash escapes, it uses `#name;` and `#number;` entity codes instead.
 */
export function escapeLabel(text) {
	return text
		.replace(/"/g, '#quot;')
		.replace(/</g, '#lt;')
		.replace(/>/g, '#gt;')
		.replace(/\[/g, '#91;')
		.replace(/]/g, '#93;')
		.replace(/`/g, '#96;')
		.replace(/\s+/g, ' ');
}

/** @returns {string} a double quoted mermaid label */
export function quote(text) {
	return `"${escapeLabel(text)}"`;
}

/**
 * The text drawn for a constant (IRI or literal) or variable.
 * Strings are shown as is, other literals as `value^^xsd:type` or `value@lang`.
 */
export function termText(term, iris) {
	switch (term.subType) {
		case 'variable':
			return '?' + term.value;
		case 'namedNode':
			return iris.text(iris.resolve(term));
		case 'literal':
			return literalText(term, iris);
		case 'blankNode':
			return '[]';
		default:
			return String(term.value ?? '');
	}
}

function literalText(literal, iris) {
	const value = literal.value === '' ? '""' : literal.value;
	const type = literal.langOrIri;
	if (type === undefined) {
		return value;
	}
	if (typeof type === 'string') {
		return `${value}@${type}`;
	}
	const datatype = iris.resolve(type);
	if (datatype === XSD + 'string') {
		return value;
	}
	const shortType = datatype.startsWith(XSD) ? 'xsd:' + datatype.slice(XSD.length) : iris.text(datatype);
	return `${literal.value}^^${shortType}`;
}

/**
 * Identifies a constant, so that the same constant is drawn as one node.
 * @returns {string|null} null for variables and blank nodes
 */
export function constantKey(term, iris) {
	if (term.subType === 'namedNode') {
		return 'iri:' + iris.resolve(term);
	}
	if (term.subType === 'literal') {
		const type = term.langOrIri;
		const suffix = type === undefined ? '' : typeof type === 'string' ? '@' + type : '^^' + iris.resolve(type);
		return 'lit:' + term.value + suffix;
	}
	return null;
}
