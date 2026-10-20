package swiss.sib.rdf.sparql.examples.mermaid;

import static swiss.sib.rdf.sparql.examples.mermaid.Labels.quote;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.BindingSet;
import org.eclipse.rdf4j.query.algebra.And;
import org.eclipse.rdf4j.query.algebra.ArbitraryLengthPath;
import org.eclipse.rdf4j.query.algebra.BindingSetAssignment;
import org.eclipse.rdf4j.query.algebra.Bound;
import org.eclipse.rdf4j.query.algebra.Coalesce;
import org.eclipse.rdf4j.query.algebra.Compare;
import org.eclipse.rdf4j.query.algebra.Count;
import org.eclipse.rdf4j.query.algebra.Datatype;
import org.eclipse.rdf4j.query.algebra.Difference;
import org.eclipse.rdf4j.query.algebra.Exists;
import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.Filter;
import org.eclipse.rdf4j.query.algebra.FunctionCall;
import org.eclipse.rdf4j.query.algebra.GroupConcat;
import org.eclipse.rdf4j.query.algebra.GroupElem;
import org.eclipse.rdf4j.query.algebra.If;
import org.eclipse.rdf4j.query.algebra.IsBNode;
import org.eclipse.rdf4j.query.algebra.IsLiteral;
import org.eclipse.rdf4j.query.algebra.IsNumeric;
import org.eclipse.rdf4j.query.algebra.IsResource;
import org.eclipse.rdf4j.query.algebra.IsURI;
import org.eclipse.rdf4j.query.algebra.Join;
import org.eclipse.rdf4j.query.algebra.Lang;
import org.eclipse.rdf4j.query.algebra.LangMatches;
import org.eclipse.rdf4j.query.algebra.LeftJoin;
import org.eclipse.rdf4j.query.algebra.ListMemberOperator;
import org.eclipse.rdf4j.query.algebra.MathExpr;
import org.eclipse.rdf4j.query.algebra.MultiProjection;
import org.eclipse.rdf4j.query.algebra.Not;
import org.eclipse.rdf4j.query.algebra.Or;
import org.eclipse.rdf4j.query.algebra.Projection;
import org.eclipse.rdf4j.query.algebra.ProjectionElem;
import org.eclipse.rdf4j.query.algebra.ProjectionElemList;
import org.eclipse.rdf4j.query.algebra.QueryModelNode;
import org.eclipse.rdf4j.query.algebra.Regex;
import org.eclipse.rdf4j.query.algebra.SameTerm;
import org.eclipse.rdf4j.query.algebra.Service;
import org.eclipse.rdf4j.query.algebra.StatementPattern;
import org.eclipse.rdf4j.query.algebra.Str;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.Union;
import org.eclipse.rdf4j.query.algebra.ValueConstant;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.ZeroLengthPath;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;

/**
 * Render the RDF4j algebra as a mermaid diagram.
 */
public final class Render extends AbstractQueryModelVisitor<RuntimeException> {
	/**
	 * rdf4j has the functions of SPARQL as functions of XPath, which have another name.
	 */
	private static final Map<String, String> SPARQL_NAMES = Map.ofEntries(Map.entry("string-length", "strlen"),
			Map.entry("substring", "substr"), Map.entry("upper-case", "ucase"), Map.entry("lower-case", "lcase"),
			Map.entry("starts-with", "strstarts"), Map.entry("ends-with", "strends"),
			Map.entry("substring-before", "strbefore"), Map.entry("substring-after", "strafter"),
			Map.entry("encode-for-uri", "encode_for_uri"), Map.entry("ceiling", "ceil"),
			Map.entry("year-from-dateTime", "year"), Map.entry("month-from-dateTime", "month"),
			Map.entry("day-from-dateTime", "day"), Map.entry("hours-from-dateTime", "hours"),
			Map.entry("minutes-from-dateTime", "minutes"), Map.entry("seconds-from-dateTime", "seconds"),
			Map.entry("timezone-from-dateTime", "timezone"));

	private int existCount = 0;

	/**
	 * Draws an EXISTS or NOT EXISTS of a filter or bind as a subgraph with nodes of its own.
	 */
	private final class FindNodesUsedInFilterOrBind extends AbstractQueryModelVisitor<RuntimeException> {
		private final String parentId;
		private final String nodePrefix;

		private FindNodesUsedInFilterOrBind(String parentId, String prefix) {
			this.parentId = parentId;
			this.nodePrefix = prefix;
		}

		@Override
		public void meet(Exists node) throws RuntimeException {
			exists(node, false);
		}

		@Override
		public void meet(Not node) throws RuntimeException {
			if (node.getArg() instanceof Exists exists) {
				exists(exists, true);
			} else {
				super.meet(node);
			}
		}

		private void exists(Exists node, boolean negated) {
			int id = existCount++;
			String existId = nodePrefix + "e" + id;
			rq.add(indent() + "subgraph " + parentId + existId + "["
					+ quote(negated ? "Not Exists Clause" : "Exists Clause") + "]");
			indent += 2;
			Map<Value, String> constantKeys = new HashMap<>();
			Map<String, String> variableKeys = new HashMap<>();
			Map<String, String> anonymousKeys = new HashMap<>();
			Set<Value> usedAsNode = new HashSet<>();

			TupleExpr subQuery = node.getSubQuery();
			subQuery.visit(new NameVariablesAndConstants(constantKeys, variableKeys, anonymousKeys, existId, expressions));
			subQuery.visit(new FindWhichConstantsAreNotOnlyUsedAsPredicates(usedAsNode));
			Render visitor = new Render(variableKeys, iriPrefixes, constantKeys, usedAsNode, anonymousKeys, rq,
					subQuery, existId);
			visitor.indent = indent;
			// the subquery, not the Exists, which is drawn by the subgraph and not by the Render
			subQuery.visit(visitor);
			visitor.renderVariables();
			indent -= 2;
			rq.add(indent() + "end");
			rq.add(indent() + parentId + " --" + quote(negated ? "NOT EXISTS" : "EXISTS") + "--> " + parentId + existId);
		}
	}

	private final Map<String, String> variableKeys;
	private final Map<String, String> iriPrefixes;
	private final Map<Value, String> constantKeys;
	private final Set<Value> usedAsNode;
	private final Map<String, String> serviceKeys = new HashMap<>();
	private final Map<String, String> anonymousKeys;
	private final List<String> rq;
	private final String prefix;
	/** The variables that rdf4j made to stand for an expression, and that expression. */
	private final Map<String, ValueExpr> expressions;
	private int indent = 2;
	private int optionalCount = 0;
	private int unionCount = 0;
	/** edges are dotted everywhere in an optional */
	private boolean optional;
	private int filterCount;
	private final TupleExpr te;

	public Render(Map<String, String> variableKeys, Map<String, String> iriPrefixes, Map<Value, String> constantKeys,
			Set<Value> usedAsNode, Map<String, String> anonymousKeys, List<String> rq, TupleExpr te) {
		this(variableKeys, iriPrefixes, constantKeys, usedAsNode, anonymousKeys, rq, te, "");
	}

	public Render(Map<String, String> variableKeys, Map<String, String> iriPrefixes, Map<Value, String> constantKeys,
			Set<Value> usedAsNode, Map<String, String> anonymousKeys, List<String> rq, TupleExpr te, String prefix) {
		this.variableKeys = variableKeys;
		this.iriPrefixes = iriPrefixes;
		this.constantKeys = constantKeys;
		this.usedAsNode = usedAsNode;
		this.anonymousKeys = anonymousKeys;
		this.rq = rq;
		this.te = te;
		this.prefix = prefix;
		this.expressions = InternalVariables.collect(te);
	}

	public void renderVariables() {
		FindProjectedVariables findProjectedVariables = new FindProjectedVariables();
		te.visit(findProjectedVariables);
		Set<Value> pv = findProjectedVariables.variables;
		Set<String> pnv = findProjectedVariables.namedVariables;
		addWithLeadingWhiteSpace(variableKeys.entrySet().stream().sorted(Comparator.comparing(Map.Entry::getKey))
				.map(en -> en.getValue() + "(" + quote("?" + en.getKey()) + ")" + addProjectedClass(en.getKey(), pnv)),
				rq);
		addWithLeadingWhiteSpace(anonymousKeys.entrySet().stream().sorted(Comparator.comparing(Map.Entry::getKey))
				.map(en -> en.getValue() + "((\" \"))" + addProjectedClass(en.getKey(), pnv)), rq);
		addWithLeadingWhiteSpace(constantKeys.entrySet().stream().filter(en -> usedAsNode.contains(en.getKey()))
				.map(en -> en.getValue() + "([" + label(en.getKey()) + "])" + addProjectedClass(en.getKey(), pv)), rq);
	}

	public void addStyles() {
		rq.add("classDef projected fill:lightgreen;");
		rq.add("classDef literal fill:orange;");
		rq.add("classDef iri fill:yellow;");
	}

	private void addWithLeadingWhiteSpace(Stream<String> map, List<String> rq) {
		map.map(s -> indent() + s).forEach(rq::add);
	}

	// ---- triple patterns and property paths

	@Override
	public void meet(StatementPattern node) throws RuntimeException {
		String subj = asString(node.getSubjectVar());
		String obj = asString(node.getObjectVar());
		if (node.getPredicateVar().isConstant() && !usedAsNode.contains(node.getPredicateVar().getValue())) {
			edge(subj, obj, Labels.text(node.getPredicateVar().getValue(), iriPrefixes));
		} else {
			// the predicate is a node as well, between the subject and object
			String arrow = optional ? "-.->" : "-->";
			rq.add(indent() + subj + " " + arrow + " " + asString(node.getPredicateVar()) + " " + arrow + " " + obj);
		}
		super.meet(node);
	}

	/**
	 * A line from one node to another, with the label of the predicate.
	 */
	private void edge(String subj, String obj, String predicate) {
		rq.add(indent() + subj + (optional ? " -." + quote(predicate) + ".-> " : " --" + quote(predicate) + "--> ") + obj);
	}

	/**
	 * rdf4j draws a path p* or p+ as one node with the path inside it, and the number of times it can be
	 * repeated. That is drawn as an edge with the path and its * or + as its label.
	 */
	@Override
	public void meet(ArbitraryLengthPath node) throws RuntimeException {
		String path = pathText(node, node.getSubjectVar().getName(), node.getObjectVar().getName());
		if (path != null) {
			edge(asString(node.getSubjectVar()), asString(node.getObjectVar()), path);
		} else {
			super.meet(node);
		}
	}

	@Override
	public void meet(ZeroLengthPath node) throws RuntimeException {
		// only has meaning with the path that it is an alternative of, see meet(Union)
	}

	@Override
	public void meet(Union u) throws RuntimeException {
		// p? is the union of p and the empty path, which is drawn as an edge with p? as its label
		if (u.getLeftArg() instanceof ZeroLengthPath zero) {
			optionalPath(zero, u.getRightArg());
			return;
		} else if (u.getRightArg() instanceof ZeroLengthPath zero) {
			optionalPath(zero, u.getLeftArg());
			return;
		}
		String thisUnionId = prefix + unionCount++;
		rq.add(indent() + "subgraph union" + thisUnionId + "[\" Union \"]");
		indent += 2;
		for (var side : List.of(Map.entry("l", u.getLeftArg()), Map.entry("r", u.getRightArg()))) {
			rq.add(indent() + "subgraph union" + thisUnionId + side.getKey() + "[\" \"]");
			indent += 2;
			rq.add(indent() + "style union" + thisUnionId + side.getKey() + " fill:#abf,stroke-dasharray: 3 3;");
			side.getValue().visit(this);
			indent -= 2;
			rq.add(indent() + "end");
		}
		rq.add(indent() + "union" + thisUnionId + "l <== or ==> union" + thisUnionId + "r");
		indent -= 2;
		rq.add(indent() + "end");
	}

	private void optionalPath(ZeroLengthPath zero, TupleExpr path) {
		String text = pathText(path, zero.getSubjectVar().getName(), zero.getObjectVar().getName());
		if (text == null) {
			path.visit(this);
		} else {
			edge(asString(zero.getSubjectVar()), asString(zero.getObjectVar()), grouped(path, text) + "?");
		}
	}

	/**
	 * rdf4j has rewritten a property path as triple patterns, joins and unions, with blank nodes between the steps.
	 *
	 * @return the path from one variable to another as it was written, for example ex:p/(ex:q|ex:r)*, or null if
	 *         the algebra is not a path
	 */
	private String pathText(TupleExpr path, String from, String to) {
		if (path instanceof StatementPattern sp && sp.getPredicateVar().isConstant()) {
			String predicate = Labels.text(sp.getPredicateVar().getValue(), iriPrefixes);
			if (sp.getSubjectVar().getName().equals(from) && sp.getObjectVar().getName().equals(to)) {
				return predicate;
			} else if (sp.getSubjectVar().getName().equals(to) && sp.getObjectVar().getName().equals(from)) {
				return "^" + predicate;
			}
		} else if (path instanceof Join join) {
			// the steps share one blank node, which is the end of the first and the start of the second
			Set<String> middle = pathVariables(join.getLeftArg());
			middle.retainAll(pathVariables(join.getRightArg()));
			if (middle.size() == 1) {
				String name = middle.iterator().next();
				String text = sequence(join.getLeftArg(), from, name, join.getRightArg(), to);
				return text != null ? text : sequence(join.getRightArg(), from, name, join.getLeftArg(), to);
			}
		} else if (path instanceof Union union) {
			String left = pathText(union.getLeftArg(), from, to);
			String right = pathText(union.getRightArg(), from, to);
			return left == null || right == null ? null : left + "|" + right;
		} else if (path instanceof ArbitraryLengthPath repeated
				&& repeated.getSubjectVar().getName().equals(from) && repeated.getObjectVar().getName().equals(to)) {
			String step = pathText(repeated.getPathExpression(), from, to);
			return step == null ? null : grouped(repeated.getPathExpression(), step) + (repeated.getMinLength() == 0 ? "*" : "+");
		}
		return null;
	}

	private String sequence(TupleExpr first, String from, String middle, TupleExpr second, String to) {
		String firstText = pathText(first, from, middle);
		String secondText = firstText == null ? null : pathText(second, middle, to);
		if (secondText == null) {
			return null;
		}
		return inSequence(first, firstText) + "/" + inSequence(second, secondText);
	}

	/**
	 * The path in brackets if it is a sequence or alternative, before a * + ? or inside a sequence.
	 */
	private static String grouped(TupleExpr path, String text) {
		return path instanceof Join || path instanceof Union ? "(" + text + ")" : text;
	}

	/**
	 * In a sequence only an alternative needs brackets.
	 */
	private static String inSequence(TupleExpr path, String text) {
		return path instanceof Union ? "(" + text + ")" : text;
	}

	/**
	 * @return the names of the blank nodes that rdf4j makes between the steps of a path
	 */
	private static Set<String> pathVariables(TupleExpr path) {
		Set<String> names = new HashSet<>();
		path.visit(new AbstractQueryModelVisitor<RuntimeException>() {
			@Override
			public void meet(Var node) {
				if (node.getName().startsWith("_anon_path_")) {
					names.add(node.getName());
				}
			}
		});
		return names;
	}

	@Override
	public void meet(LeftJoin s) throws RuntimeException {
		s.getLeftArg().visit(this);
		boolean wasOptional = optional;
		optional = true;
		String optionalId = prefix + optionalCount++;
		rq.add(indent() + "subgraph optional" + optionalId + "[\"(optional)\"]");
		indent += 2;
		rq.add(indent() + "style optional" + optionalId + " fill:#bbf,stroke-dasharray: 5 5;");
		s.getRightArg().visit(this);
		// a FILTER in the OPTIONAL is the condition of the LeftJoin
		if (s.getCondition() != null) {
			filter(s.getCondition());
		}
		indent -= 2;
		rq.add(indent() + "end");
		optional = wasOptional;
	}

	@Override
	public void meet(Service s) throws RuntimeException {
		Var service = s.getServiceRef();
		String name = service.hasValue() ? service.getValue().stringValue() : "?" + service.getName();
		String key = serviceKeys.computeIfAbsent(name, (t) -> prefix + "s" + (serviceKeys.size() + 1));
		rq.add(indent() + "subgraph " + key + "[" + quote(name) + "]");
		indent += 2;
		rq.add(indent() + "style " + key + " stroke-width:4px;");
		super.meet(s);
		indent -= 2;
		rq.add(indent() + "end");
	}

	@Override
	public void meet(Difference s) throws RuntimeException {
		s.getLeftArg().visit(this);
		String key = prefix + "minus" + filterCount++;
		rq.add(indent() + "subgraph " + key + "[\"MINUS\"]");
		indent += 2;
		rq.add(indent() + "style " + key + " stroke-width:6px,fill:pink,stroke:red;");
		s.getRightArg().visit(this);
		indent -= 2;
		rq.add(indent() + "end");
	}

	// ---- filter, bind, values

	@Override
	public void meet(Filter f) throws RuntimeException {
		if (negatedPropertySet(f)) {
			return;
		}
		filter(f.getCondition());
		// not the condition: an EXISTS in it is drawn by the filter
		f.getArg().visit(this);
	}

	/**
	 * rdf4j rewrites a negated property set, !(p|q), as a triple pattern with a blank node as its predicate, and a
	 * filter that says that it is not p and not q. That is drawn as an edge with !(p|q) as its label.
	 *
	 * @return true if it is
	 */
	private boolean negatedPropertySet(Filter f) {
		if (!(f.getArg() instanceof StatementPattern sp) || sp.getPredicateVar().isConstant()
				|| !sp.getPredicateVar().getName().startsWith("_anon_path_")) {
			return false;
		}
		List<String> excluded = new ArrayList<>();
		if (!notEqual(f.getCondition(), sp.getPredicateVar().getName(), excluded)) {
			return false;
		}
		String text = excluded.size() == 1 ? excluded.get(0) : "(" + String.join("|", excluded) + ")";
		edge(asString(sp.getSubjectVar()), asString(sp.getObjectVar()), "!" + text);
		return true;
	}

	private boolean notEqual(ValueExpr condition, String variable, List<String> excluded) {
		if (condition instanceof And and) {
			return notEqual(and.getLeftArg(), variable, excluded) && notEqual(and.getRightArg(), variable, excluded);
		} else if (condition instanceof Compare compare && compare.getOperator() == Compare.CompareOp.NE
				&& compare.getLeftArg() instanceof Var var && var.getName().equals(variable)
				&& compare.getRightArg() instanceof ValueConstant constant) {
			excluded.add(Labels.text(constant.getValue(), iriPrefixes));
			return true;
		}
		return false;
	}

	private void filter(ValueExpr condition) {
		String filterId = prefix + "f" + filterCount++;
		ValueExprAsString visitor2 = new ValueExprAsString(filterId);
		condition.visit(visitor2);

		rq.add(indent() + filterId + "[[" + quote(visitor2.sb.toString()) + "]]");
		condition.visit(new FindNodesUsedInFilterOrBind(filterId, prefix));
		condition.visit(new FindValues(filterId, "-->", false));
	}

	@Override
	public void meet(BindingSetAssignment b) throws RuntimeException {
		String bindId = prefix + "bind" + filterCount++;
		List<String> names = new ArrayList<>(b.getBindingNames());
		rq.add(indent() + bindId + "[/"
				+ quote("VALUES " + names.stream().map(s -> "?" + s).collect(Collectors.joining(" "))) + "/]");
		for (String bn : names) {
			rq.add(indent() + bindId + " --> " + variableKeys.get(bn));
		}
		int row = 0;
		for (BindingSet bs : b.getBindingSets()) {
			row++;
			int column = 0;
			for (String bn : names) {
				column++;
				if (bs.getValue(bn) != null) { // UNDEF has no value
					String valueId = bindId + "r" + row + "c" + column;
					rq.add(indent() + valueId + "([" + label(bs.getValue(bn)) + "])");
					rq.add(indent() + valueId + " --> " + bindId);
				}
			}
		}
		super.meet(b);
	}

	@Override
	public void meet(ExtensionElem node) throws RuntimeException {
		super.meet(node);
		// rdf4j makes an ExtensionElem for variables of its own, which are drawn as the expression they stand for
		if (InternalVariables.isInternal(node.getName())) {
			return;
		}
		String bindId = prefix + "bind" + filterCount++;
		{
			ValueExprAsString visitor = new ValueExprAsString(bindId);
			node.visitChildren(visitor);
			rq.add(indent() + bindId + "[/" + quote(visitor.sb.toString()) + "/]");
		}
		node.visitChildren(new FindNodesUsedInFilterOrBind(bindId, prefix));
		node.visitChildren(new FindValues(bindId, "--o", true));
		if (node.getName() != null && variableKeys.containsKey(node.getName())) {
			rq.add(indent() + bindId + " --as--o " + variableKeys.get(node.getName()));
		}
	}

	@Override
	public void meet(GroupElem node) throws RuntimeException {
		node.getOperator().visit(this);
	}

	/**
	 * An EXISTS is drawn by the filter or bind that it is part of, in a subgraph. Not here as well.
	 */
	@Override
	public void meet(Exists node) throws RuntimeException {
	}

	// ---- helpers

	private String indent() {
		return IntStream.range(0, indent).mapToObj(i -> " ").collect(Collectors.joining());
	}

	private String asString(Var v) {
		if (v.isAnonymous() && !v.isConstant()) {
			return anonymousKeys.get(v.getName());
		} else if (v.isConstant()) {
			return constantKeys.get(v.getValue());
		} else {
			return variableKeys.get(v.getName());
		}
	}

	/**
	 * @return a value as a double quoted mermaid label
	 */
	private String label(Value v) {
		return quote(Labels.text(v, iriPrefixes));
	}

	private static String addProjectedClass(Value v, Set<Value> variables) {
		if (variables.contains(v)) {
			return ":::projected";
		} else if (v.isLiteral()) {
			return ":::literal";
		} else if (v.isIRI()) {
			return ":::iri";
		}
		return "";
	}

	private static String addProjectedClass(String name, Set<String> variables) {
		if (variables.contains(name)) {
			return ":::projected";
		}
		return "";
	}

	/**
	 * Finds the variables that the query selects. Of an expression (expression AS ?alias) the variables that are
	 * in it, not the alias.
	 */
	private class FindProjectedVariables extends AbstractQueryModelVisitor<RuntimeException> {

		private Set<String> namedVariables = new HashSet<>();
		private Set<Value> variables = new HashSet<>();
		private boolean inExpression;

		@Override
		public void meet(Projection node) throws RuntimeException {
			projected(node.getProjectionElemList());
		}

		/**
		 * A CONSTRUCT with more than one triple pattern in its template: the variables of the template.
		 */
		@Override
		public void meet(MultiProjection node) throws RuntimeException {
			node.getProjections().forEach(this::projected);
		}

		private void projected(ProjectionElemList projectionElemList) {
			for (ProjectionElem element : projectionElemList.getElements()) {
				if (element.getSourceExpression() != null) {
					ValueExpr expr = element.getSourceExpression().getExpr();
					inExpression = true;
					expr.visit(this);
					inExpression = false;
				} else if (!InternalVariables.isInternal(element.getName())) {
					namedVariables.add(element.getName());
				}
			}
		}

		@Override
		public void meet(Var node) throws RuntimeException {
			super.meet(node);
			// not the variables of a query without a projection (ASK)
			if (!inExpression) {
				return;
			}
			ValueExpr expression = expressions.get(node.getName());
			if (expression != null) {
				expression.visit(this);
			} else if (node.isConstant() && !node.isAnonymous()) {
				variables.add(node.getValue());
			} else {
				namedVariables.add(node.getName());
			}
		}
	}

	/**
	 * Draws a link from a filter or bind to each of the variables that are in its expression.
	 */
	private class FindValues extends AbstractQueryModelVisitor<RuntimeException> {

		private final Set<String> variables = new HashSet<>();
		private final String parentId;
		private final boolean forward;
		private final String arrow;

		public FindValues(String parentId, String arrow, boolean forward) {
			super();
			this.parentId = parentId;
			this.arrow = arrow;
			this.forward = forward;
		}

		@Override
		public void meet(Var node) throws RuntimeException {
			super.meet(node);
			ValueExpr expression = expressions.get(node.getName());
			if (expression != null) {
				expression.visit(this);
			} else if (!node.isAnonymous() && !node.isConstant() && variables.add(node.getName())) {
				if (forward) {
					rq.add(indent() + asString(node) + " " + arrow + " " + parentId);
				} else {
					rq.add(indent() + parentId + " " + arrow + " " + asString(node));
				}
			}
		}
	}

	/**
	 * The text of a filter or bind.
	 */
	private class ValueExprAsString extends AbstractQueryModelVisitor<RuntimeException> {

		private final String parentId;
		private final StringBuilder sb = new StringBuilder();

		public ValueExprAsString(String bindId) {
			this.parentId = bindId;
		}

		private void function(String name, ValueExpr... arguments) {
			sb.append(name).append('(');
			for (int i = 0; i < arguments.length; i++) {
				if (i > 0) {
					sb.append(',');
				}
				arguments[i].visit(this);
			}
			sb.append(')');
		}

		@Override
		public void meet(IsBNode node) throws RuntimeException {
			function("isBlank", node.getArg());
		}

		@Override
		public void meet(IsLiteral node) throws RuntimeException {
			function("isLiteral", node.getArg());
		}

		@Override
		public void meet(IsNumeric node) throws RuntimeException {
			function("isNumeric", node.getArg());
		}

		@Override
		public void meet(IsResource node) throws RuntimeException {
			sb.append("isIRI(");
			node.getArg().visit(this);
			sb.append(") || isBlank(");
			node.getArg().visit(this);
			sb.append(")");
		}

		@Override
		public void meet(IsURI node) throws RuntimeException {
			function("isIRI", node.getArg());
		}

		@Override
		public void meet(LangMatches node) throws RuntimeException {
			function("langmatch", node.getLeftArg(), node.getRightArg());
		}

		@Override
		public void meet(Lang node) throws RuntimeException {
			function("lang", node.getArg());
		}

		@Override
		public void meet(Datatype node) throws RuntimeException {
			function("datatype", node.getArg());
		}

		@Override
		public void meet(Coalesce node) throws RuntimeException {
			function("coalesce", node.getArguments().toArray(ValueExpr[]::new));
		}

		private void aggregate(String name, org.eclipse.rdf4j.query.algebra.AbstractAggregateOperator node) {
			sb.append(name).append('(');
			if (node.isDistinct()) {
				sb.append("distinct ");
			}
			if (node.getArg() != null) {
				node.getArg().visit(this);
			} else {
				sb.append("*");
			}
			sb.append(")");
		}

		@Override
		public void meet(org.eclipse.rdf4j.query.algebra.Avg node) throws RuntimeException {
			aggregate("average", node);
		}

		@Override
		public void meet(org.eclipse.rdf4j.query.algebra.Sample node) throws RuntimeException {
			aggregate("sample", node);
		}

		@Override
		public void meet(org.eclipse.rdf4j.query.algebra.Max node) throws RuntimeException {
			aggregate("max", node);
		}

		@Override
		public void meet(org.eclipse.rdf4j.query.algebra.Min node) throws RuntimeException {
			aggregate("min", node);
		}

		@Override
		public void meet(org.eclipse.rdf4j.query.algebra.Sum node) throws RuntimeException {
			aggregate("sum", node);
		}

		@Override
		public void meet(Count node) throws RuntimeException {
			aggregate("count", node);
		}

		@Override
		public void meet(GroupConcat node) throws RuntimeException {
			aggregate("group_concat", node);
		}

		/**
		 * An expression that has no meet of its own is drawn as a function of its parts, as IRI(...) or BNODE(...)
		 * are, and not left out.
		 */
		@Override
		protected void meetNode(QueryModelNode node) throws RuntimeException {
			if (!(node instanceof ValueExpr)) {
				super.meetNode(node);
				return;
			}
			List<ValueExpr> parts = new ArrayList<>();
			node.visitChildren(new AbstractQueryModelVisitor<RuntimeException>() {
				@Override
				protected void meetNode(QueryModelNode child) {
					if (child instanceof ValueExpr part) {
						parts.add(part);
					}
				}
			});
			String name = node.getClass().getSimpleName();
			name = switch (name) {
			case "IRIFunction" -> "iri";
			case "BNodeGenerator" -> "bnode";
			default -> name.toLowerCase(Locale.ROOT);
			};
			function(name, parts.toArray(ValueExpr[]::new));
		}

		@Override
		public void meet(Var node) throws RuntimeException {
			ValueExpr expression = expressions.get(node.getName());
			if (expression != null) {
				expression.visit(this);
			} else if (!node.isAnonymous() && !node.isConstant()) {
				sb.append("?" + node.getName());
			} else if (node.isAnonymous() && !node.isConstant()) {
				sb.append("[]");
			} else if (node.isConstant()) {
				sb.append(constant(node.getValue()));
			}
		}

		@Override
		public void meet(SameTerm node) throws RuntimeException {
			function("sameterm", node.getLeftArg(), node.getRightArg());
		}

		@Override
		public void meet(Not node) throws RuntimeException {
			sb.append("not ");
			ValueExpr argument = node.getArg();
			boolean parentheses = argument instanceof Compare || argument instanceof MathExpr;
			if (parentheses) {
				sb.append('(');
			}
			argument.visit(this);
			if (parentheses) {
				sb.append(')');
			}
		}

		@Override
		public void meet(Bound node) throws RuntimeException {
			function("bound", node.getArg());
		}

		@Override
		public void meet(Exists node) throws RuntimeException {
			sb.append("exists"); // drawn as a subgraph by FindNodesUsedInFilterOrBind
		}

		@Override
		public void meet(Compare node) throws RuntimeException {
			node.getLeftArg().visit(this);
			switch (node.getOperator()) {
			case EQ -> sb.append(" = ");
			case NE -> sb.append(" != ");
			case LT -> sb.append(" < ");
			case GT -> sb.append(" > ");
			case LE -> sb.append(" <= ");
			case GE -> sb.append(" >= ");
			}
			node.getRightArg().visit(this);
		}

		@Override
		public void meet(Str node) throws RuntimeException {
			function("str", node.getArg());
		}

		@Override
		public void meet(If node) throws RuntimeException {
			function("if", node.getCondition(), node.getResult(), node.getAlternative());
		}

		@Override
		public void meet(And node) throws RuntimeException {
			list(operands(node, true), " && ");
		}

		@Override
		public void meet(Or node) throws RuntimeException {
			list(operands(node, false), " || ");
		}

		/**
		 * (a && b) && c and a && (b && c) are drawn as (a && b && c)
		 */
		private List<ValueExpr> operands(ValueExpr node, boolean and) {
			List<ValueExpr> operands = new ArrayList<>();
			collect(node, and, operands);
			return operands;
		}

		private void collect(ValueExpr node, boolean and, List<ValueExpr> operands) {
			if (and && node instanceof And a) {
				collect(a.getLeftArg(), and, operands);
				collect(a.getRightArg(), and, operands);
			} else if (!and && node instanceof Or o) {
				collect(o.getLeftArg(), and, operands);
				collect(o.getRightArg(), and, operands);
			} else {
				operands.add(node);
			}
		}

		private void list(List<ValueExpr> operands, String operator) {
			sb.append("(");
			for (int i = 0; i < operands.size(); i++) {
				if (i > 0) {
					sb.append(operator);
				}
				operands.get(i).visit(this);
			}
			sb.append(")");
		}

		@Override
		public void meet(Regex node) throws RuntimeException {
			// TODO escape a regex properly so that it does not kill jekyll
			if (node.getFlagsArg() != null) {
				function("regex", node.getLeftArg(), node.getRightArg(), node.getFlagsArg());
			} else {
				function("regex", node.getLeftArg(), node.getRightArg());
			}
		}

		@Override
		public void meet(MathExpr node) throws RuntimeException {
			operand(node.getLeftArg(), node, false);
			sb.append(" ");
			sb.append(node.getOperator().getSymbol());
			sb.append(" ");
			operand(node.getRightArg(), node, true);
		}

		private int precedence(MathExpr node) {
			return switch (node.getOperator()) {
			case PLUS, MINUS -> 1;
			case MULTIPLY, DIVIDE -> 2;
			};
		}

		/**
		 * (a + b) * c has parentheses, as the algebra only has the structure
		 */
		private void operand(ValueExpr operand, MathExpr parent, boolean right) {
			boolean parentheses = operand instanceof MathExpr m
					&& (precedence(m) < precedence(parent) || (right && precedence(m) == precedence(parent)));
			if (parentheses) {
				sb.append("(");
			}
			operand.visit(this);
			if (parentheses) {
				sb.append(")");
			}
		}

		@Override
		public void meet(FunctionCall node) throws RuntimeException {
			if (node.getURI().startsWith("http://www.w3.org/2005/xpath-functions#")) {
				String name = node.getURI().substring("http://www.w3.org/2005/xpath-functions#".length());
				function(SPARQL_NAMES.getOrDefault(name, name), node.getArgs().toArray(ValueExpr[]::new));
			} else if (node.getURI().indexOf(':') < 0) {
				// the name of a function of SPARQL that is not an IRI, such as NOW
				function(node.getURI().toLowerCase(Locale.ROOT), node.getArgs().toArray(ValueExpr[]::new));
			} else {
				function(Labels.iri(node.getURI(), iriPrefixes), node.getArgs().toArray(ValueExpr[]::new));
			}
		}

		@Override
		public void meet(ValueConstant node) throws RuntimeException {
			sb.append(constant(node.getValue()));
		}

		private String constant(Value value) {
			return "'" + Labels.text(value, iriPrefixes) + "'";
		}

		/**
		 * x IN (a, b) is drawn as x in, with the a and b as nodes, with a link to the filter.
		 */
		@Override
		public void meet(ListMemberOperator node) throws RuntimeException {
			List<ValueExpr> arguments = node.getArguments();
			arguments.get(0).visit(this);
			sb.append(" in");

			int id = existCount++;
			String existId = prefix + "list" + id;
			Map<Value, String> constantKeys = new HashMap<>();
			Map<String, String> variableKeys = new HashMap<>();
			Map<String, String> anonymousKeys = new HashMap<>();

			node.visit(new NameVariablesAndConstants(constantKeys, variableKeys, anonymousKeys, existId));
			addWithLeadingWhiteSpace(constantKeys.entrySet().stream()
					.map(en -> en.getValue() + "([" + label(en.getKey()) + "])" + addProjectedClass(en.getKey(), Set.of())),
					rq);
			// The first value is skipped because that is the value being filtered against
			for (int i = 1; i < arguments.size(); i++) {
				ValueExpr ve = arguments.get(i);
				if (ve instanceof ValueConstant vc) {
					String source = constantKeys.get(vc.getValue());
					rq.add(indent() + source + " --o " + parentId);
				} else if (ve instanceof Var va) {
					rq.add(indent() + asString(va) + " --o " + parentId);
				}
			}
		}
	}
}
