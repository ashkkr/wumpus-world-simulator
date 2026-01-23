/**
 * This accepts a CNF sentence of the form double array like [[1,2],[-2,3]] where each interger represents a prop symbol
 */

function dpll_satisfiable(sentence) {
    const startTime =
        typeof performance !== "undefined" ? performance.now() : Date.now();
    const clauses = new Set(sentence);
    const symbols = new Set();

    Array.isArray(sentence) &&
        sentence.flat().forEach((t) => {
            symbols.add(Math.abs(t));
        });

    console.log({
        dpll: "start",
        clauses: clauses.size,
        symbols: symbols.size,
    });
    const result = dpll(clauses, symbols, new Map());
    const endTime =
        typeof performance !== "undefined" ? performance.now() : Date.now();
    console.log({
        dpll: "end",
        result,
        elapsedMs: endTime - startTime,
    });
    return result;
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

    if (symbols.size === 0) {
        throw new Error("Invalid symbols: expected non-empty Set.");
    }

    const nextsymbol = symbols.values().next().value;
    const rest = new Set(symbols);
    rest.delete(nextsymbol);

    const modeltrue = new Map(model);
    modeltrue.set(nextsymbol, true);
    modeltrue.set(nextsymbol * -1, false);

    const modelfalse = new Map(model);
    modelfalse.set(nextsymbol, false);
    modelfalse.set(nextsymbol * -1, true);

    return (
        dpll(clauses, new Set(rest), modeltrue) ||
        dpll(clauses, new Set(rest), modelfalse)
    );
}
