class LogicalAgent {
    constructor() {
        this.defaultKeys = {
            up: false,
            left: false,
            right: false,
            down: false,
            space: false,
            enter: false,
        };

        this.haveArrow = true;
        this.wumpusAlive = true;
        // to speeden up dpll calls
        this.safeLoc = new Set(["1,1", "1,2", "2,1"]);
        this.unvisited = new Set(["1,2", "2,1"]);
        this.visited = new Set(["1,1"]);
        this.curr = [1, 1];
        this.playerDirection = "down";
        this.actionList = [];
        this.kb = new KnowledgeBase();
        this.attemptToKillWumpus = false;
    }

    getAllClauses() {
        return this.kb.getAllClauses();
    }

    tell = (percept) => {
        if (
            percept.stench == false &&
            this.percept &&
            this.percept.stench == true
        )
            this.wumpusAlive = false;

        this.percept = percept;
        console.log({ percept });

        this.kb.tellPercept(
            {
                breeze: this.percept.breeze === true,
                stench: this.percept.stench === true,
            },
            this.curr,
        );
    };

    moveDown = () => {
        const action = { ...this.defaultKeys, down: true };
        const moved = this.updateCurrentLocation(action);

        if (!moved) {
            this.actionList.unshift(action);
        }

        return { ...action };
    };

    moveLeft = () => {
        const action = { ...this.defaultKeys, left: true };
        const moved = this.updateCurrentLocation(action);

        if (!moved) {
            this.actionList.unshift(action);
        }

        return { ...action };
    };

    moveRight = () => {
        const action = { ...this.defaultKeys, right: true };
        const moved = this.updateCurrentLocation(action);

        if (!moved) {
            this.actionList.unshift(action);
        }

        return { ...action };
    };

    moveUp = () => {
        const action = { ...this.defaultKeys, up: true };
        const moved = this.updateCurrentLocation(action);

        if (!moved) {
            this.actionList.unshift(action);
        }

        return { ...action };
    };

    updateCurrentLocation(action) {
        let moved = false;
        if (!action || typeof action !== "object") return moved;

        if (action.space) {
            this.haveArrow = false;
        } else if (action.up && this.playerDirection === "up") {
            this.curr = [this.curr[0] - 1, this.curr[1]];
            moved = true;
        } else if (action.down && this.playerDirection === "down") {
            this.curr = [this.curr[0] + 1, this.curr[1]];
            moved = true;
        } else if (action.left && this.playerDirection === "left") {
            this.curr = [this.curr[0], this.curr[1] - 1];
            moved = true;
        } else if (action.right && this.playerDirection === "right") {
            this.curr = [this.curr[0], this.curr[1] + 1];
            moved = true;
        }

        if (!moved) {
            if (action.up) {
                this.playerDirection = "up";
            } else if (action.down) {
                this.playerDirection = "down";
            } else if (action.left) {
                this.playerDirection = "left";
            } else if (action.right) {
                this.playerDirection = "right";
            }
        }

        return moved;
    }

    ask = () => {
        console.log(this.actionList);
        if (this.actionList.length > 0) {
            const action = this.actionList[0];
            this.actionList = this.actionList.slice(1);
            if (action == "up") return this.moveUp();
            if (action == "down") return this.moveDown();
            if (action == "left") return this.moveLeft();
            if (action == "right") return this.moveRight();

            this.updateCurrentLocation(action);
            return { ...action };
        }

        if (this.percept.glitter == true) {
            const route = this.planRoute(this.safeLoc, this.curr, [1, 1]);
            this.executeRoute(route, true);
            return { ...this.defaultKeys, enter: true };
        }
        if (this.percept.bump == true) {
            return this.moveDown();
        }

        return this.explore();
    };

    explore() {
        const [row, col] = this.curr;
        const candidates = [
            { pos: [row - 1, col] },
            { pos: [row + 1, col] },
            { pos: [row, col - 1] },
            { pos: [row, col + 1] },
        ];

        const key = `${this.curr[0]},${this.curr[1]}`;
        this.visited.add(key);
        this.unvisited.delete(key);

        for (const { pos } of candidates) {
            const [r, c] = pos;
            if (r < 1 || c < 1 || r > this.kb.height || c > this.kb.width)
                continue;
            const key = `${r},${c}`;
            if (this.safeLoc.has(key)) continue;
            if (this.kb.isOk(pos)) {
                this.safeLoc.add(key);
                if (!this.visited.has(key)) this.unvisited.add(key);
            }
        }
        for (const { pos } of candidates) {
            const [r, c] = pos;
            if (r < 1 || c < 1 || r > this.kb.height || c > this.kb.width)
                continue;
            const key = `${r},${c}`;
            if (this.unvisited.has(key)) {
                const destination = [r, c];
                const route = this.planRoute(
                    this.safeLoc,
                    this.curr,
                    destination,
                );
                this.executeRoute(route, false);
                return { ...this.defaultKeys };
            }
        }

        if (this.unvisited.size > 0) {
            const firstKey = this.unvisited.values().next().value;
            const destination = firstKey.split(",").map((n) => Number(n));
            const route = this.planRoute(this.safeLoc, this.curr, destination);
            this.executeRoute(route, false);
            return { ...this.defaultKeys };
        }

        if (this.haveArrow && !this.attemptToKillWumpus)
            return this.tryToKillWumpus();

        if (!this.haveArrow) {
            const wumpusAlive = this.kb.isWumpusAlive();
            if (wumpusAlive === false) {
                const stenchPositions = this.kb.getStenchPositions();
                if (Array.isArray(stenchPositions)) {
                    for (const pos of stenchPositions) {
                        this.unvisited.add(pos);
                    }
                }
                return { ...this.defaultKeys };
            }
        }

        const route = this.planRoute(this.safeLoc, this.curr, [1, 1]);
        this.executeRoute(route, true);
        return { ...this.defaultKeys };
    }

    tryToKillWumpus = () => {
        this.attemptToKillWumpus = true;
        let wumpusLocation = this.kb.findWumpus(this.safeLoc);

        if (wumpusLocation == null) {
            wumpusLocation = this.guessWumpusLocation();
            if (!wumpusLocation) {
                console.log(`No wumpus location`);
                return { ...this.defaultKeys };
            }
            console.log(
                `Could not find WUMPUS. hence guessing ${wumpusLocation[0]},${wumpusLocation[1]}`,
            );
        }

        if (!Array.isArray(wumpusLocation) || wumpusLocation.length < 2)
            return { ...this.defaultKeys };

        const [wr, wc] = wumpusLocation;
        const candidates = [
            [wr - 1, wc],
            [wr + 1, wc],
            [wr, wc - 1],
            [wr, wc + 1],
        ];

        let safeNeighbor = null;
        for (const [r, c] of candidates) {
            if (r < 1 || c < 1 || r > this.kb.height || c > this.kb.width)
                continue;
            const key = `${r},${c}`;
            if (this.safeLoc.has(key)) {
                safeNeighbor = [r, c];
                break;
            }
        }

        if (!safeNeighbor) {
            console.log("no safe positions");
            return { ...this.defaultKeys };
        }

        const route = this.planRoute(this.safeLoc, this.curr, safeNeighbor);
        if (!Array.isArray(route) || route.length === 0) {
            console.log("no route to safe position");
            return { ...this.defaultKeys };
        }
        this.executeRoute(route, false);

        const dx = wr - safeNeighbor[0];
        const dy = wc - safeNeighbor[1];
        let shootDir = null;
        if (dx === 1 && dy === 0) shootDir = "down";
        else if (dx === -1 && dy === 0) shootDir = "up";
        else if (dx === 0 && dy === 1) shootDir = "right";
        else if (dx === 0 && dy === -1) shootDir = "left";

        if (!shootDir) return { ...this.defaultKeys };

        let finalDirection = this.playerDirection;
        if (route.length >= 2) {
            const prev = route[route.length - 2];
            const next = route[route.length - 1];
            const stepX = next[0] - prev[0];
            const stepY = next[1] - prev[1];
            if (stepX === 1 && stepY === 0) finalDirection = "down";
            else if (stepX === -1 && stepY === 0) finalDirection = "up";
            else if (stepX === 0 && stepY === 1) finalDirection = "right";
            else if (stepX === 0 && stepY === -1) finalDirection = "left";
        }

        if (finalDirection !== shootDir) {
            const turnAction = { ...this.defaultKeys };
            turnAction[shootDir] = true;
            this.actionList.push(turnAction);
        }
        this.actionList.push({ ...this.defaultKeys, space: true });
        return { ...this.defaultKeys };
    };

    guessWumpusLocation = () => {
        const stenchPositions = this.kb.getStenchPositions();

        for (const key of stenchPositions) {
            const [row, col] = key.split(",").map((n) => Number(n));
            const candidates = [
                [row - 1, col],
                [row + 1, col],
                [row, col - 1],
                [row, col + 1],
            ];

            for (const [r, c] of candidates) {
                if (r < 1 || c < 1 || r > this.kb.height || c > this.kb.width)
                    continue;
                const candidateKey = `${r},${c}`;
                if (!this.safeLoc.has(candidateKey)) return [r, c];
            }
        }

        for (const key of this.safeLoc) {
            const [row, col] = key.split(",").map((n) => Number(n));
            const candidates = [
                [row - 1, col],
                [row + 1, col],
                [row, col - 1],
                [row, col + 1],
            ];

            for (const [r, c] of candidates) {
                if (r < 1 || c < 1 || r > this.kb.height || c > this.kb.width)
                    continue;
                const candidateKey = `${r},${c}`;
                if (!this.safeLoc.has(candidateKey)) return [r, c];
            }
        }

        return null;
    };

    executeRoute = (path, climbOut) => {
        if (!Array.isArray(path) || path.length < 2) return;

        for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const next = path[i];
            const dx = next[0] - prev[0];
            const dy = next[1] - prev[1];

            if (dx === 1 && dy === 0) this.actionList.push("down");
            else if (dx === -1 && dy === 0) this.actionList.push("up");
            else if (dx === 0 && dy === 1) this.actionList.push("right");
            else if (dx === 0 && dy === -1) this.actionList.push("left");
        }

        if (climbOut)
            this.actionList.push({ ...this.defaultKeys, enter: true });
    };

    // dfs
    planRoute = (allowed, curr, destination) => {
        const keyFor = ([x, y]) => `${x},${y}`;
        const posFromKey = (key) => key.split(",").map((n) => Number(n));

        const destKey = keyFor(destination);
        const allowedSet = new Set(allowed);
        const currKey = keyFor(curr);
        allowedSet.add(currKey);
        if (destKey !== currKey && !allowedSet.has(destKey)) return [];

        const stack = [curr];
        const visited = new Set([currKey]);
        const parent = new Map();
        const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];

        while (stack.length > 0) {
            const loc = stack.pop();
            const locKey = keyFor(loc);

            if (locKey === destKey) break;

            for (const [dx, dy] of dirs) {
                const next = [loc[0] + dx, loc[1] + dy];
                const nextKey = keyFor(next);
                if (!allowedSet.has(nextKey) || visited.has(nextKey)) continue;
                visited.add(nextKey);
                parent.set(nextKey, locKey);
                stack.push(next);
            }
        }

        if (!visited.has(destKey)) return [];

        const path = [];
        let step = destKey;
        while (step) {
            path.push(posFromKey(step));
            step = parent.get(step);
        }
        return path.reverse();
    };
}
