"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Humidifier = void 0;
const state_1 = require("./state");
const device_1 = require("./device");
class Humidifier extends device_1.MiioDevice {
    constructor(host, token) {
        super(host, token);
        this.state = new state_1.DeviceState();
        this.syncState();
        setInterval(this.syncState.bind(this), 60000);
    }
    syncState() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.call('get_prop', ["power", "mode", "temp_dec", "humidity", "depth"]);
            if (result.code !== 0) {
                console.error('Humidifier.updateProps caused an error', result);
                return;
            }
            const props = result.data;
            this.state.update({
                enabled: props[0] === 'on',
                mode: props[1],
                temperature: props[2] / 10,
                humidity: props[3],
                water_level: Math.min(100, props[4] / 120 * 100),
            });
        });
    }
    enable() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.call('set_power', ['on']);
            if (result.code === 0 && result.data[0] === 'ok') {
                this.state.update({ enabled: true });
            }
        });
    }
    disable() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.call('set_power', ['off']);
            if (result.code === 0 && result.data[0] === 'ok') {
                this.state.update({ enabled: false });
            }
        });
    }
    get props() {
        return this.state.props;
    }
}
exports.Humidifier = Humidifier;
//# sourceMappingURL=humidifier.js.map