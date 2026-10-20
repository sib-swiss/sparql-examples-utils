import { termText } from './labels.js';

/** Names of functions as drawn, where they differ from the SPARQL keyword. */
const FUNCTION_NAMES = {
	isiri: 'isIRI',
	isuri: 'isIRI',
	isblank: 'isBlank',
	isliteral: 'isLiteral',
	isnumeric: 'isNumeric',
	langmatches: 'langmatch',
	avg: 'average',
};

const INFIX = {
	'||': 1, '&&': 2,
	'=': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
	'+': 4, '-': 4,
	'*': 5, '/': 5,
};
const LOGICAL = new Set(['||', '&&']);

/**
 * Turns a SPARQL expression into the text drawn in a filter or bind node, and
 * collects what the diagram has to connect to that node.
 */
export class ExpressionPrinter {
	constructor(iris) {
		this.iris = iris;
		/** @type {Set<string>} names of the variables used, not counting those inside EXISTS */
		this.variables = new Set();
		/** @type {Array<{negated: boolean, group: object}>} */
		this.exists = [];
		/** @type {object[]} constants listed in IN (...) and NOT IN (...), drawn as nodes of their own */
		this.listMembers = [];
	}

	/** @returns {string} */
	print(expression) {
		switch (expression.type) {
			case 'term':
				return this.term(expression);
			case 'wildcard':
				return '*';
			case 'expression':
				switch (expression.subType) {
					case 'operation':
						return this.operation(expression);
					case 'aggregate':
						return this.aggregate(expression);
					case 'functionCall':
						return this.functionCall(expression);
					case 'patternOperation':
						this.exists.push({ negated: expression.operator === 'notexists', group: expression.args });
						return expression.operator === 'notexists' ? 'not exists' : 'exists';
					default:
						return '';
				}
			default:
				return '';
		}
	}

	term(term) {
		if (term.subType === 'variable') {
			this.variables.add(term.value);
			return '?' + term.value;
		}
		if (term.subType === 'blankNode') {
			return '[]';
		}
		return `'${termText(term, this.iris)}'`;
	}

	operation({ operator, args }) {
		if (LOGICAL.has(operator)) {
			return '(' + this.flatten(operator, args).map((a) => this.print(a)).join(` ${operator} `) + ')';
		}
		if (operator in INFIX && args.length >= 2) {
			return args.map((a, i) => this.operand(a, operator, i)).join(` ${operator} `);
		}
		switch (operator) {
			case '!':
				return 'not ' + this.operand(args[0], '!', 0);
			case 'uminus':
				return '-' + this.operand(args[0], 'uminus', 0);
			case 'uplus':
				return '+' + this.operand(args[0], 'uplus', 0);
			case 'in':
			case 'notin': {
				const [left, ...members] = args;
				const text = this.print(left) + (operator === 'in' ? ' in' : ' not in');
				for (const member of members) {
					if (member.type === 'term' && member.subType !== 'variable' && member.subType !== 'blankNode') {
						this.listMembers.push(member);
					} else {
						this.print(member); // only to find out which variables it uses
					}
				}
				return text;
			}
			default:
				return `${FUNCTION_NAMES[operator] ?? operator}(${args.map((a) => this.print(a)).join(',')})`;
		}
	}

	/** `a && (b && c)` and `(a && b) && c` are drawn as one list of operands */
	flatten(operator, args) {
		return args.flatMap((a) =>
			a.type === 'expression' && a.subType === 'operation' && a.operator === operator
				? this.flatten(operator, a.args)
				: [a]);
	}

	/** parentheses where the structure of the AST would otherwise not be visible in the text */
	operand(expression, parentOperator, index) {
		const text = this.print(expression);
		if (expression.type !== 'expression' || expression.subType !== 'operation'
			|| LOGICAL.has(expression.operator) || !(expression.operator in INFIX)) {
			return text;
		}
		const parent = INFIX[parentOperator];
		const child = INFIX[expression.operator];
		const needsParentheses = parent === undefined || child < parent || (child === parent && index > 0);
		return needsParentheses ? `(${text})` : text;
	}

	aggregate({ aggregation, distinct, expression }) {
		const name = FUNCTION_NAMES[aggregation] ?? aggregation;
		const inner = (Array.isArray(expression) ? expression : [expression]).map((e) => this.print(e)).join(',');
		return `${name}(${distinct ? 'distinct ' : ''}${inner})`;
	}

	functionCall({ function: name, args }) {
		return `${termText(name, this.iris)}(${args.map((a) => this.print(a)).join(',')})`;
	}
}
