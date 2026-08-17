package swiss.sib.rdf.sparql.examples.tests;

public record TestResult(boolean failed, String messages, Exception e) {

	public TestResult(boolean failed) {
		this(failed, null, exception(failed));
	}

	public TestResult(Exception e) {
		this(true, e.getMessage(), e);
	}

	public TestResult() {
		this(false, null, null);
	}

	private static Exception exception(boolean failed) {
		if (failed) {
			try {
				throw new Exception();
			} catch (Exception e) {
				return e;
			}
		} else
			return null;
	}
}
