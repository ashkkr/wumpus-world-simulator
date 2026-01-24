// starting digit
// wumpus 1
// pits 2
// ok 3
// stench 4
// breeze 5
// location 6
// wumpus alive 701

class KnowledgeBase {
    constructor() {
        this.haveArrow = true;
        this.wumpusAlive = true;
        this.safeLoc = new Set(["1,1"]);
        this.curr = [1, 1];
        this.playerDirection = "down";
        this.kb = [];
        this.stenchPositions = [];
        this.width = 4;
        this.height = 4;

        this.initialiseAtemporalAxioms();
    }

    getAllClauses() {
        return this.kb;
    }

    tellPercept(percept, location) {
        if (!location || location.length < 2) {
            throw new Error("Invalid location: expected [row, col].");
        }
        const [row, col] = location;
        const index = (row - 1) * this.width + (col - 1);
        const locKey = `${row},${col}`;
        const breezeVar = 501 + index;
        const stenchVar = 401 + index;

        if (!percept || typeof percept !== "object") {
            throw new Error(
                "Invalid percept: expected object with boolean breeze and stench.",
            );
        }

        const { breeze, stench } = percept;
        if (typeof breeze !== "boolean" || typeof stench !== "boolean") {
            throw new Error(
                "Invalid percept: expected object with boolean breeze and stench.",
            );
        }

        const removeUnitClause = (literal) => {
            this.kb = this.kb.filter(
                (clause) =>
                    !(
                        Array.isArray(clause) &&
                        clause.length === 1 &&
                        clause[0] === literal
                    ),
            );
        };

        const breezeClause = [breeze ? breezeVar : -breezeVar];
        this.kb.push(breezeClause);
        console.log({ clause: breezeClause, type: "breeze", loc: locKey });

        const stenchClause = [stench ? stenchVar : -stenchVar];
        this.kb.push(stenchClause);
        console.log({ clause: stenchClause, type: "stench", loc: locKey });

        if (stench) {
            if (!this.stenchPositions.includes(locKey)) {
                this.stenchPositions.push(locKey);
            }
        } else if (this.stenchPositions.includes(locKey)) {
            removeUnitClause(stenchVar);
        }
    }

    initialiseAtemporalAxioms() {
        // no pit in 1,1
        this.kb.push([-201]);
        // no wumpus in 1,1
        this.kb.push([-101]);
        // wumpus is alive
        this.kb.push([701]);
        // 1,1 is ok
        this.kb.push([301]);

        this.initialiseWumpus();
        this.initialiseBreeze();
        this.initialiseStench();
        this.initialiseOk();
    }

    initialiseWumpus() {
        const startVar = 101;
        const totalCells = this.width * this.height;
        const wumpusVars = [];

        for (let i = 0; i < totalCells; i++) {
            wumpusVars.push(startVar + i);
        }

        // At least one wumpus.
        this.kb.push(wumpusVars);

        // At most one wumpus: for every pair, add (~Wi v ~Wj).
        for (let i = 0; i < wumpusVars.length; i++) {
            for (let j = i + 1; j < wumpusVars.length; j++) {
                this.kb.push([-wumpusVars[i], -wumpusVars[j]]);
            }
        }
    }

    initialiseBreeze() {
        const breezeStart = 501;
        const pitStart = 201;
        const indexFor = (row, col) => (row - 1) * this.width + (col - 1);

        for (let row = 1; row <= this.height; row++) {
            for (let col = 1; col <= this.width; col++) {
                const breezeVar = breezeStart + indexFor(row, col);

                const adjacents = [];
                if (row > 1) adjacents.push([row - 1, col]);
                if (row < this.height) adjacents.push([row + 1, col]);
                if (col > 1) adjacents.push([row, col - 1]);
                if (col < this.width) adjacents.push([row, col + 1]);

                const pitDisjunction = [];
                for (const [adjRow, adjCol] of adjacents) {
                    pitDisjunction.push(pitStart + indexFor(adjRow, adjCol));
                }
                if (pitDisjunction.length > 0) {
                    this.kb.push(
                        ...this.biconditionalToCnf(breezeVar, pitDisjunction),
                    );
                }
            }
        }
    }

    initialiseStench() {
        const stenchStart = 401;
        const wumpusStart = 101;
        const indexFor = (row, col) => (row - 1) * this.width + (col - 1);

        for (let row = 1; row <= this.height; row++) {
            for (let col = 1; col <= this.width; col++) {
                const stenchVar = stenchStart + indexFor(row, col);

                const adjacents = [];
                if (row > 1) adjacents.push([row - 1, col]);
                if (row < this.height) adjacents.push([row + 1, col]);
                if (col > 1) adjacents.push([row, col - 1]);
                if (col < this.width) adjacents.push([row, col + 1]);

                const wumpusDisjunction = [];
                for (const [adjRow, adjCol] of adjacents) {
                    wumpusDisjunction.push(
                        wumpusStart + indexFor(adjRow, adjCol),
                    );
                }
                if (wumpusDisjunction.length > 0) {
                    this.kb.push(
                        ...this.biconditionalToCnf(
                            stenchVar,
                            wumpusDisjunction,
                        ),
                    );
                }
            }
        }
    }

    initialiseOk() {
        const okStart = 301;
        const pitStart = 201;
        const wumpusStart = 101;
        const wumpusAlive = 701;
        const indexFor = (row, col) => (row - 1) * this.width + (col - 1);

        for (let row = 1; row <= this.height; row++) {
            for (let col = 1; col <= this.width; col++) {
                const idx = indexFor(row, col);
                const okVar = okStart + idx;
                const pitVar = pitStart + idx;
                const wumpusVar = wumpusStart + idx;

                // ok <-> (¬pit ∧ ¬(wumpusAlive ∧ wumpusVar))
                this.kb.push([-okVar, -pitVar]);
                this.kb.push([-okVar, -wumpusAlive, -wumpusVar]);
                this.kb.push([pitVar, okVar, wumpusAlive]);
                this.kb.push([pitVar, okVar, wumpusVar]);
            }
        }
    }

    biconditionalToCnf(clause1, clause2) {
        const isNumber = (value) =>
            typeof value === "number" && Number.isFinite(value);
        const is1dArray = (value) =>
            Array.isArray(value) &&
            value.length > 0 &&
            value.every((n) => isNumber(n));
        const is2dArray = (value) =>
            Array.isArray(value) &&
            value.length > 0 &&
            value.every((arr) => is1dArray(arr));

        const cnf = [];
        const addPart = (part) => {
            if (is1dArray(part)) cnf.push(part);
            else if (is2dArray(part)) cnf.push(...part);
            else throw new Error("Invalid CNF: expected 1d array or 2d array.");
        };

        addPart(this.impliesToCnf(clause1, clause2));
        addPart(this.impliesToCnf(clause2, clause1));
        return cnf;
    }

    impliesToCnf(antecedent, consequent) {
        const isNumber = (value) =>
            typeof value === "number" && Number.isFinite(value);
        const is1dArray = (value) =>
            Array.isArray(value) &&
            value.length > 0 &&
            value.every((n) => isNumber(n));

        let consequentParts;
        if (isNumber(consequent)) {
            consequentParts = [consequent];
        } else if (is1dArray(consequent)) {
            consequentParts = [...consequent];
        } else {
            throw new Error("Invalid consequent: expected number, 1d array");
        }

        if (isNumber(antecedent)) {
            return [-antecedent, ...consequentParts];
        }
        if (is1dArray(antecedent)) {
            const negated = this.negate(antecedent);
            return negated.map((clause) => [...clause, ...consequentParts]);
        }
        throw new Error("Invalid antecedent: expected number or 1d array.");
    }

    negate(clause) {
        if (typeof clause === "number" && Number.isFinite(clause)) {
            return -clause;
        }
        if (
            Array.isArray(clause) &&
            clause.length > 0 &&
            clause.every((n) => typeof n === "number" && Number.isFinite(n))
        ) {
            return clause.map((literal) => [-literal]);
        }
        throw new Error("Invalid clause: expected number or array of numbers.");
    }

    findWumpus() {
        const wumpusStart = 101;
        const indexFor = (row, col) => (row - 1) * this.width + (col - 1);
        let fallback = null;

        for (let row = 1; row <= this.height; row++) {
            for (let col = 1; col <= this.width; col++) {
                const key = `${row},${col}`;
                if (this.safeLoc.has(key)) continue;

                console.log(`Checking for wumpus in ${row},${col}`);
                const wumpusVar = wumpusStart + indexFor(row, col);
                const tempKb = [...this.kb, [-wumpusVar, -this.wumpusAlive]];
                const isWumpus = !dpll_satisfiable(tempKb);
                if (isWumpus) {
                    console.log("WUMPUS FOUND");
                    return [row, col];
                } else console.log("No wumpus found");
            }
        }

        return fallback;
    }

    isOk(location) {
        if (!location || location.length < 2) {
            throw new Error("Invalid location: expected [row, col].");
        }
        const [row, col] = location;
        const index = (row - 1) * this.width + (col - 1);
        const okVar = 301 + index;
        const negatedOk = this.negate(okVar);
        const negatedClause = Array.isArray(negatedOk)
            ? negatedOk
            : [negatedOk];

        const tempKb = [...this.kb, negatedClause];
        const isOk = !dpll_satisfiable(tempKb);
        console.log({ loc: String(location), isOk });
        return isOk;
    }
}
