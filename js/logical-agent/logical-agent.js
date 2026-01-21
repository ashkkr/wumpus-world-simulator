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
        this.curr = [1, 1];
        this.playerDirection = "down";
        this.actionList = [];
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
    };

    moveDown = () => {
        if (this.playerDirection != "down")
            this.actionList.unshift({ ...this.defaultKeys, down: true });

        this.playerDirection = "down";
        this.curr = [this.curr[0] + 1, this.curr[1]];
        this.safeLoc.add(`${this.curr[0]},${this.curr[1]}`);
        return { ...this.defaultKeys, down: true };
    };

    moveLeft = () => {
        if (this.playerDirection != "left")
            this.actionList.unshift({ ...this.defaultKeys, left: true });

        this.playerDirection = "left";
        this.curr = [this.curr[0], this.curr[1] - 1];
        this.safeLoc.add(`${this.curr[0]},${this.curr[1]}`);
        return { ...this.defaultKeys, left: true };
    };

    moveRight = () => {
        if (this.playerDirection != "right")
            this.actionList.unshift({ ...this.defaultKeys, right: true });

        this.playerDirection = "right";
        this.curr = [this.curr[0], this.curr[1] + 1];
        this.safeLoc.add(`${this.curr[0]},${this.curr[1]}`);
        return { ...this.defaultKeys, right: true };
    };

    moveUp = () => {
        if (this.playerDirection != "up")
            this.actionList.unshift({ ...this.defaultKeys, up: true });

        this.playerDirection = "up";
        this.curr = [this.curr[0] - 1, this.curr[1]];
        this.safeLoc.add(`${this.curr[0]},${this.curr[1]}`);
        return { ...this.defaultKeys, up: true };
    };

    ask = () => {
        console.log(this.actionList);
        if (this.actionList.length > 0) {
            const action = this.actionList[0];
            this.actionList = this.actionList.slice(1);
            if (action == "up") return this.moveUp();
            if (action == "down") return this.moveDown();
            if (action == "left") return this.moveLeft();
            if (action == "right") return this.moveRight();
            return action;
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
        if (this.percept.breeze == true || this.percept.stench == true) {
            return this.moveDown();
        }
        return this.moveRight();
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
