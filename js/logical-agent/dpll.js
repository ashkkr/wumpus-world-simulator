/**
 * This accepts a CNF sentence of the form double array like [[1,2],[-2,3]] where each interger represents a prop symbol
 */

function dpll_satisfiable(sentence) {
    const clauses = new Set(sentence);
    const symbols = new Set();

    Array.isArray(sentence) &&
        sentence.flat().forEach((t) => {
            symbols.add(Math.abs(t));
        });

    return dpll(clauses, symbols, new Map());
}

function dpll(clauses, symbols, model) {
    // every clause is true in model, return true
    let satisfiable = true;
    for (const clause of clauses) {
        let clauseval = false;
        for (const s of clause) {
            if (model.has(s)) {
                const sval = model.get(s);
                if (sval === true) {
                    clauseval = true;
                    break;
                }
            } else {
                clauseval = undefined;
            }
        }
        if (clauseval === false) return false;
        if (clauseval === undefined) satisfiable = undefined;
    }

    if (satisfiable === true) return true;

    const nextsymbol = symbols.values().next().value;
    symbols.delete(nextsymbol);
    const rest = new Set(symbols);

    const modeltrue = new Map(model);
    modeltrue.set(nextsymbol, true);
    modeltrue.set(nextsymbol * -1, false);

    const modelfalse = new Map(model);
    modelfalse.set(nextsymbol, false);
    modelfalse.set(nextsymbol * -1, true);

    return dpll(clauses, symbols, modeltrue) || dpll(clauses, rest, modelfalse);
}
