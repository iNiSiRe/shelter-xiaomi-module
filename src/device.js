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
exports.MiioDevice = void 0;
const miio_1 = require("./miio");
class MiioDevice {
    constructor(host, token) {
        this.host = host;
        this.token = token;
        this.miio = new miio_1.Miio(host, token);
    }
    call(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.miio.call(method, params);
        });
    }
    info() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.call('miIO.info', []);
            if (result.code !== 0) {
                return false;
            }
            return result.data;
        });
    }
}
exports.MiioDevice = MiioDevice;
//# sourceMappingURL=device.js.map