from rdflib.plugins.sparql import prepareQuery

print("here");

class SparqlQueryTester:
    def test(self, oquery):
        print("testing q")
        try:
            q = prepareQuery(oquery)
            return true
        except:
            return false

polyglot.export_value("SparqlQueryTester", SparqlQueryTester)
