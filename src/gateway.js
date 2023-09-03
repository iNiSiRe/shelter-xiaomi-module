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
exports.XiaomiGateway = void 0;
const childDevice_1 = require("./childDevice");
const zigbee_1 = require("./zigbee");
const device_1 = require("./device");
class XiaomiGateway extends device_1.MiioDevice {
    constructor(host, token, childFactory = new childDevice_1.ChildDeviceFactory()) {
        super(host, token);
        this.childFactory = childFactory;
        this.devices = [];
        this.observer = new zigbee_1.ZigbeeObserver(host);
        this.observer.on('report', this.handleReport.bind(this));
        this.observer.on('heartbeat', this.handleHeartbeat.bind(this));
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            this.observer.start();
            yield this.loadDevices();
        });
    }
    getSubDevices() {
        return this.devices;
    }
    loadDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            this.devices = [];
            let total = 0;
            let loaded = 0;
            do {
                const list = yield this.getDeviceList();
                if (list.length > 0) {
                    total = list[0].total;
                }
                loaded += list.length;
                for (const subDevice of list) {
                    const device = this.childFactory.create(subDevice.did, subDevice.model);
                    if (!device) {
                        continue;
                    }
                    this.devices.push(device);
                }
            } while (loaded < total);
            console.log('Xiaomi gateway: child devices loaded', `count=${this.devices.length}`);
        });
    }
    getDeviceList() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.call('get_device_list', []);
            if (result.code !== 0) {
                return [];
            }
            return result.data;
        });
    }
    handleReport(report) {
        for (const device of this.devices) {
            if (device.did === report.did) {
                device.handleZigbeeReport(report.params, { rssi: report.rssi, zseq: report.zseq });
                console.log('Handle ZigbeeReport', device.did, device.model, device.state.props);
            }
        }
    }
    handleHeartbeat(heartbeat) {
        for (const update of heartbeat.params) {
            for (const device of this.devices) {
                if (device.did === update.did) {
                    device.handleZigbeeHeartbeat(update.res_list, { rssi: heartbeat.rssi, zseq: update.zseq });
                    console.log('Handle ZigbeeHeartbeat', device.did, device.model, device.state.props);
                }
            }
        }
    }
}
exports.XiaomiGateway = XiaomiGateway;
//# sourceMappingURL=gateway.js.map