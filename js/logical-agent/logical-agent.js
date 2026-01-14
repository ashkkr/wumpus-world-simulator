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
    }

    tell = (percept) => {
        this.percept = percept;
        console.log({ percept });
    };

    ask = () => {
        if (this.percept.breeze == true || this.percept.stench == true) {
            return { ...this.defaultKeys, down: true };
        } else {
            return { ...this.defaultKeys, right: true };
        }
    };
}
