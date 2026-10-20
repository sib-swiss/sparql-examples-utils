package swiss.sib.rdf.sparql.examples.mermaid;

import java.util.Map;

import org.eclipse.rdf4j.model.Value;
import org.eclipse.rdf4j.query.algebra.BindingSetAssignment;
import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.ListMemberOperator;
import org.eclipse.rdf4j.query.algebra.ProjectionElem;
import org.eclipse.rdf4j.query.algebra.ValueConstant;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.Var;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;

/**
 * Gives the variables, blank nodes and constants of a query the id they have in the diagram.
 */
public final class NameVariablesAndConstants extends AbstractQueryModelVisitor<RuntimeException> {
	private final Map<Value, String> constantKeys;
	private final Map<String, String> variableKeys;
	private final Map<String, String> anonymousKeys;
	private final Map<String, ValueExpr> expressions;
	private final String prefix;

	public NameVariablesAndConstants(Map<Value, String> constantKeys, Map<String, String> variableKeys,
			Map<String, String> anonymousKeys) {
		this(constantKeys, variableKeys, anonymousKeys, "", Map.of());
	}

	public NameVariablesAndConstants(Map<Value, String> constantKeys, Map<String, String> variableKeys,
			Map<String, String> anonymousKeys, String prefix) {
		this(constantKeys, variableKeys, anonymousKeys, prefix, Map.of());
	}

	/**
	 * @param expressions the variables of rdf4j that stand for an expression, see InternalVariables. They are not
	 *                    a node of their own.
	 */
	public NameVariablesAndConstants(Map<Value, String> constantKeys, Map<String, String> variableKeys,
			Map<String, String> anonymousKeys, String prefix, Map<String, ValueExpr> expressions) {
		this.constantKeys = constantKeys;
		this.variableKeys = variableKeys;
		this.anonymousKeys = anonymousKeys;
		this.prefix = prefix;
		this.expressions = expressions;
	}

	@Override
	public void meet(Var node) throws RuntimeException {
		super.meet(node);
		if (expressions.containsKey(node.getName())) {
			return;
		}
		if (node.isAnonymous() && !node.isConstant()) {
			if (!anonymousKeys.containsKey(node.getName())) {
				String nextId = prefix + "a" + (anonymousKeys.size() + 1);
				anonymousKeys.put(node.getName(), nextId);
			}
		} else if (!node.isConstant()) {
			nameVariable(node.getName());
		} else if (!constantKeys.containsKey(node.getValue())) {
			String nextId = prefix + "c" + (constantKeys.size() + 1);
			constantKeys.put(node.getValue(), nextId);
		}
	}

	/**
	 * Only when it has no id yet. A variable that gets a second id, which makes the next variable get the id it
	 * had, would merge two variables in the diagram.
	 */
	private void nameVariable(String name) {
		if (!variableKeys.containsKey(name)) {
			variableKeys.put(name, prefix + "v" + (variableKeys.size() + 1));
		}
	}

	@Override
	public void meet(BindingSetAssignment node) throws RuntimeException {
		super.meet(node);
		for (String name : node.getBindingNames()) {
			nameVariable(name);
		}
	}

	@Override
	public void meet(ExtensionElem node) throws RuntimeException {
		super.meet(node);
		if (!InternalVariables.isInternal(node.getName())) {
			nameVariable(node.getName());
		}
	}

	/**
	 * A variable that is selected is a node, also if the query does not use it.
	 */
	@Override
	public void meet(ProjectionElem node) throws RuntimeException {
		super.meet(node);
		if (node.getSourceExpression() == null && !InternalVariables.isInternal(node.getName())) {
			nameVariable(node.getName());
		}
	}

	@Override
	public void meet(ListMemberOperator node) throws RuntimeException {
		for (ValueExpr argument : node.getArguments()) {
			argument.visit(this);
		}
	}

	@Override
	public void meet(ValueConstant node) throws RuntimeException {
		if (!constantKeys.containsKey(node.getValue())) {
			String nextId = prefix + "c" + (constantKeys.size() + 1);
			constantKeys.put(node.getValue(), nextId);
		}
	}
}
