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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const netbus_1 = require("netbus");
const module_1 = require("../src/module");
const busId = (_a = process.env.BUS_ID) !== null && _a !== void 0 ? _a : '';
const busHost = (_b = process.env.BUS) !== null && _b !== void 0 ? _b : '';
const configPath = (_c = process.env.CONFIG) !== null && _c !== void 0 ? _c : '';
if (busId === '' || busHost === '' || configPath === '') {
    console.error('Not enough arguments! Usage: BUS_ID=xiaomi BUS=127.0.0.1 CONFIG=xiaomi.yml node xiaomi/module.js');
    process.exit(-1);
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const bus = yield netbus_1.Connector.connect(busId, busHost);
    const module = new module_1.XiaomiModule(bus, module_1.Configuration.fromFile(configPath));
    yield module.setup();
}))();
//# sourceMappingURL=server.js.map