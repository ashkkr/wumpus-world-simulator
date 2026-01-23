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
        this.safeLoc = new Set(["1,1"]);
        this.unvisited = new Set();
        this.visited = new Set(["1,1"]);
        this.curr = [1, 1];
        this.playerDirection = "down";
        this.actionList = [];
        this.kb = new KnowledgeBase();
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
        this.updateCurrentLocation(action);

        if (this.playerDirection != "down") {
            this.actionList.unshift(action);
            this.playerDirection = "down";
        }

        return { ...action };
    };

    moveLeft = () => {
        const action = { ...this.defaultKeys, left: true };
        this.updateCurrentLocation(action);

        if (this.playerDirection != "left") {
            this.actionList.unshift(action);
            this.playerDirection = "left";
        }

        return { ...action };
    };

    moveRight = () => {
        const action = { ...this.defaultKeys, right: true };
        this.updateCurrentLocation(action);

        if (this.playerDirection != "right") {
            this.actionList.unshift(action);
            this.playerDirection = "right";
        }

        return { ...action };
    };

    moveUp = () => {
        const action = { ...this.defaultKeys, up: true };
        this.updateCurrentLocation(action);

        if (this.playerDirection != "up") {
            this.actionList.unshift(action);
            this.playerDirection = "up";
        }

        return { ...action };
    };

    updateCurrentLocation(action) {
        if (!action || typeof action !== "object") return;

        let moved = false;
        if (action.up && this.playerDirection === "up") {
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

        if (moved) {
            const key = `${this.curr[0]},${this.curr[1]}`;
            this.visited.add(key);
            this.unvisited.delete(key);
        }
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

        if (this.percept.stench == true && this.haveArrow) {
            this.haveArrow = false;
            return { ...this.defaultKeys, space: true };
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

        const route = this.planRoute(this.safeLoc, this.curr, [1, 1]);
        this.executeRoute(route, true);
        return { ...this.defaultKeys };
    }

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
