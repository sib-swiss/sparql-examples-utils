const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
export const XSD = 'http://www.w3.org/2001/XMLSchema#';

/**
 * Prefixes that can be used without declaring them, as rdf4j allows, which the Java version uses to parse.
 * A declaration in the query replaces them.
 */
export const DEFAULT_PREFIXES = Object.freeze({
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
	owl: 'http://www.w3.org/2002/07/owl#',
	xsd: XSD,
	fn: 'http://www.w3.org/2005/xpath-functions#',
});

/**
 * Resolves and shortens the IRIs of one query.
 *
 * The Traqula AST keeps prefixed names as `{ prefix, value: localName }` and
 * relative IRIs as written, so this turns them into absolute IRIs again.
 */
export class Iris {
	/**
	 * @param {object} ast the parsed query
	 * @param {{base?: string, prefixes?: Map<string,string>|Record<string,string>}} options
	 *        `prefixes` maps prefix labels to namespaces, and is used to shorten IRIs in the
	 *        diagram. Defaults to the PREFIX declarations of the query and DEFAULT_PREFIXES.
	 */
	constructor(ast, options = {}) {
		this.base = options.base ?? 'https://example.org/';
		/** @type {Map<string,string>} prefix label to namespace, as declared in the query */
		this.declared = new Map(Object.entries(DEFAULT_PREFIXES));
		for (const declaration of ast.context ?? []) {
			if (declaration.subType === 'prefix') {
				this.declared.set(declaration.key, declaration.value.value);
			} else if (declaration.subType === 'base') {
				this.base = declaration.value.value;
			}
		}
		const labelled = options.prefixes ? entriesOf(options.prefixes) : [...this.declared];
		// namespace to 'label:'. The shortest namespace is tried first, as in the Java version.
		const byNamespace = new Map();
		for (const [label, namespace] of labelled) {
			byNamespace.set(namespace, label.endsWith(':') ? label : label + ':');
		}
		this.shorteners = [...byNamespace].sort(
			([a], [b]) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
	}

	/** @returns {string} the absolute IRI of a `namedNode` term */
	resolve(term) {
		if (term.prefix !== undefined) {
			const namespace = this.declared.get(term.prefix);
			if (namespace === undefined) {
				throw new Error(`Undeclared prefix '${term.prefix}:'`);
			}
			return namespace + term.value;
		}
		if (SCHEME.test(term.value)) {
			return term.value;
		}
		try {
			return new URL(term.value, this.base).href;
		} catch {
			return term.value;
		}
	}

	/** @returns {string} `label:local` when a prefix matches, else the IRI itself */
	text(iri) {
		if (iri === RDF_TYPE) {
			return 'a';
		}
		for (const [namespace, label] of this.shorteners) {
			if (iri.startsWith(namespace)) {
				return label + iri.slice(namespace.length);
			}
		}
		return iri;
	}
}

function entriesOf(prefixes) {
	return prefixes instanceof Map ? [...prefixes] : Object.entries(prefixes);
}
