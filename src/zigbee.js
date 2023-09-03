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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZigbeeObserver = void 0;
const events_1 = require("events");
const mqtt = __importStar(require("mqtt"));
class ZigbeeObserver extends events_1.EventEmitter {
    constructor(host) {
        super();
        this.host = host;
    }
    start() {
        if (this.connection !== undefined) {
            console.error('Started already');
            return;
        }
        this.connection = mqtt.connect('mqtt://' + this.host);
        this.connection.on('message', this.handleMessage.bind(this));
        this.connection.subscribe('zigbee/send');
    }
    handleMessage(topic, message) {
        const object = JSON.parse(message.toString());
        const zigbeeMessage = object;
        console.log(zigbeeMessage);
        switch (zigbeeMessage.cmd) {
            case 'report': {
                const report = object;
                const params = new Map();
                for (const param of report.params) {
                    params.set(param.res_name, param.value);
                }
                this.emit('report', report);
                break;
            }
            case 'heartbeat': {
                const heartbeat = object;
                this.emit('heartbeat', heartbeat);
                break;
            }
            default: {
                console.log('Unexpected zigbee message: ', zigbeeMessage);
            }
        }
    }
}
exports.ZigbeeObserver = ZigbeeObserver;
//# sourceMappingURL=zigbee.js.map