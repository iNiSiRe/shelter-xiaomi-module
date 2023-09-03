"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceState = exports.ChangeSet = void 0;
const events_1 = require("events");
class ChangeSet extends Map {
}
exports.ChangeSet = ChangeSet;
class DeviceState extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.state = new Map();
    }
    update(changes) {
        const changed = new ChangeSet();
        for (const [name, value] of Object.entries(changes)) {
            if (this.state.has(name) && this.state.get(name) === value) {
                continue;
            }
            this.state.set(name, value);
            changed.set(name, value);
        }
        if (changed.size > 0) {
            this.emit('update', changed);
        }
    }
    get props() {
        const object = {};
        for (const [name, value] of this.state) {
            object[name] = value;
        }
        return object;
    }
}
exports.DeviceState = DeviceState;
//# sourceMappingURL=state.js.map