package swiss.sib.rdf.sparql.examples.mermaid;

import java.util.HashMap;
import java.util.Map;

import org.eclipse.rdf4j.query.algebra.ExtensionElem;
import org.eclipse.rdf4j.query.algebra.GroupElem;
import org.eclipse.rdf4j.query.algebra.TupleExpr;
import org.eclipse.rdf4j.query.algebra.ValueExpr;
import org.eclipse.rdf4j.query.algebra.helpers.AbstractQueryModelVisitor;

/**
 * rdf4j rewrites HAVING, ORDER BY and aggregates inside an expression, e.g. CONCAT(STR(SAMPLE(?x)), "..."),
 * to use variables of its own, such as _anon_having_5d2.. that stand for COUNT(?x), and have an
 * ExtensionElem or GroupElem that says what they stand for. In a diagram they are shown as that expression.
 */
final class InternalVariables {

	private InternalVariables() {
	}

	/**
	 * @return true for the names rdf4j makes for a variable that stands for an expression, and for the
	 *         constants and described resources of CONSTRUCT and DESCRIBE, which are not variables of the query.
	 *         Not _anon_path_, which is a blank node in the middle of a property path.
	 */
	static boolean isInternal(String name) {
		return name.startsWith("_const_") || name.startsWith("_describe_")
				|| (name.startsWith("_anon_") && !name.startsWith("_anon_path_"));
	}

	/**
	 * @return for each variable that stands for an expression, that expression
	 */
	static Map<String, ValueExpr> collect(TupleExpr root) {
		Map<String, ValueExpr> expressions = new HashMap<>();
		root.visit(new AbstractQueryModelVisitor<RuntimeException>() {
			@Override
			public void meet(GroupElem node) {
				if (node.getName().startsWith("_anon_") && isInternal(node.getName())) {
					expressions.putIfAbsent(node.getName(), node.getOperator());
				}
				super.meet(node);
			}

			@Override
			public void meet(ExtensionElem node) {
				if (node.getName().startsWith("_anon_") && isInternal(node.getName())) {
					expressions.putIfAbsent(node.getName(), node.getExpr());
				}
				super.meet(node);
			}
		});
		return expressions;
	}
}
