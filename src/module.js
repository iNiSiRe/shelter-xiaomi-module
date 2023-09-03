"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XiaomiModule = exports.GatewayChildDevice = exports.Gateway = exports.Humidifier = exports.Configuration = void 0;
const netbus_1 = require("netbus");
const humidifier_1 = require("./humidifier");
const fs_1 = __importDefault(require("fs"));
const Yaml = __importStar(require("js-yaml"));
const gateway_1 = require("./gateway");
const device_1 = require("./device");
class Configuration {
    constructor() {
        this.devices = [];
    }
    static fromFile(path) {
        const config = new Configuration();
        const data = fs_1.default.readFileSync(path);
        const yaml = Yaml.load(data.toString());
        for (const device of yaml.devices) {
            const params = new Map(Object.entries(device.parameters));
            config.devices.push({ id: device.id, parameters: params });
        }
        return config;
    }
}
exports.Configuration = Configuration;
class Humidifier {
    constructor(config, bus) {
        this.config = config;
        this.bus = bus;
        const host = config.parameters.get('host');
        const token = config.parameters.get('token');
        this.device = new humidifier_1.Humidifier(host, token);
        this.device.state.on('update', this.dispatchUpdate.bind(this));
    }
    dispatchUpdate(changed) {
        this.bus.dispatch({
            name: 'Device.Update',
            data: { device: this.id, update: Object.fromEntries(changed.entries()), properties: this.device.props }
        });
    }
    call(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (method) {
                case 'enable': {
                    yield this.device.enable();
                    break;
                }
                case 'disable': {
                    yield this.device.disable();
                    break;
                }
            }
            return new netbus_1.Result(0, this.properties);
        });
    }
    get properties() {
        return this.device.props;
    }
    get id() {
        return this.config.id;
    }
    get model() {
        var _a;
        return (_a = this.config.model) !== null && _a !== void 0 ? _a : '';
    }
}
exports.Humidifier = Humidifier;
class Gateway {
    constructor(id, model, device) {
        this.id = id;
        this.model = model;
        this.device = device;
    }
    call(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new netbus_1.Result(-1, {});
        });
    }
    get properties() {
        return {};
    }
}
exports.Gateway = Gateway;
class GatewayChildDevice {
    constructor(device, bus) {
        this.device = device;
        this.bus = bus;
        device.state.on('update', this.dispatchUpdate.bind(this));
    }
    call(method, params) {
        return Promise.resolve(new netbus_1.Result(-1, { error: 'Method not exists' }));
    }
    get id() {
        return this.device.did;
    }
    get model() {
        return this.device.model;
    }
    get properties() {
        return this.device.state.props;
    }
    dispatchUpdate(changes) {
        this.bus.dispatch({
            name: 'Device.Update',
            data: { device: this.id, update: Object.fromEntries(changes.entries()), properties: this.properties }
        });
    }
}
exports.GatewayChildDevice = GatewayChildDevice;
class XiaomiModule {
    constructor(bus, config) {
        this.bus = bus;
        this.config = config;
        this.devices = [];
        this.startedAt = 0;
        this.bus.subscribe('Discover.Request', this.handleDiscoverRequest.bind(this));
        this.bus.on('Module.Status', (query) => __awaiter(this, void 0, void 0, function* () {
            const FormatMemoryUsage = (data) => Math.round((data / 1024 / 1024) * 100) / 100;
            return new netbus_1.Result(0, {
                uptime: Math.floor((Date.now() - this.startedAt) / 1000),
                memory: FormatMemoryUsage(process.memoryUsage().rss)
            });
        }));
        this.bus.on('Device.Call', (query) => __awaiter(this, void 0, void 0, function* () {
            const call = query.data;
            for (const device of this.devices) {
                if (device.id === call.device) {
                    return device.call(call.method, call.parameters);
                }
            }
            return new netbus_1.Result(-1, { error: 'Device not found' });
        }));
    }
    loadDevice(config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!config.model) {
                const host = config.parameters.get('host');
                const token = config.parameters.get('token');
                const miio = new device_1.MiioDevice(host, token);
                const info = yield miio.info();
                if (info === false) {
                    console.error('Xiaomi: Cant load device info', config.id);
                    return;
                }
                config.model = info.model;
            }
            let device = null;
            switch (config.model) {
                case 'lumi.gateway.mgl03': {
                    const host = config.parameters.get('host');
                    const token = config.parameters.get('token');
                    const gateway = new gateway_1.XiaomiGateway(host, token);
                    yield gateway.setup();
                    device = new Gateway(config.id, config.model, gateway);
                    for (const subDevice of gateway.getSubDevices()) {
                        this.devices.push(new GatewayChildDevice(subDevice, this.bus));
                        console.log('Xiaomi gateway: child device is loaded', subDevice.did, device.model);
                    }
                    break;
                }
                case 'zhimi.humidifier.ca1': {
                    device = new Humidifier(config, this.bus);
                    break;
                }
                default: {
                    console.log(`Xiaomi: ${config.model} isn't supported device model`);
                }
            }
            if (!device) {
                return;
            }
            this.devices.push(device);
            console.log(`Device #${device.id} (${device.model}) is loaded`);
        });
    }
    setup() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const config of this.config.devices) {
                yield this.loadDevice(config);
            }
            console.log('Xiaomi module is ready', `Devices loaded: ${this.devices.length}`);
            this.startedAt = Date.now();
        });
    }
    handleDiscoverRequest() {
        for (const device of this.devices) {
            this.bus.dispatch(new netbus_1.Event('Discover.Response', {
                device: device.id,
                model: device.model,
                properties: device.properties
            }));
        }
    }
}
exports.XiaomiModule = XiaomiModule;
//# sourceMappingURL=module.js.map