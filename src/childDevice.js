"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildDeviceFactory = exports.MagnetSensor = exports.MotionSensor = exports.WeatherSensor = exports.ChildDevice = void 0;
const state_1 = require("./state");
class ChildDevice {
    constructor(did, model) {
        this.did = did;
        this.model = model;
        this.state = new state_1.DeviceState();
    }
    handleZigbeeReport(update, quality) {
    }
    handleZigbeeHeartbeat(update, quality) {
        for (const param of update) {
            switch (param.res_name) {
                case '8.0.2008': {
                    const voltage = param.value / 1000;
                    this.state.update({ battery_voltage: voltage });
                    break;
                }
            }
        }
    }
}
exports.ChildDevice = ChildDevice;
class WeatherSensor extends ChildDevice {
    constructor(did, model) {
        super(did, model);
        this.state = new state_1.DeviceState();
    }
    handleZigbeeReport(update, quality) {
        super.handleZigbeeReport(update, quality);
        for (const param of update) {
            switch (param.res_name) {
                case '0.1.85': {
                    const temperature = param.value / 100;
                    if (temperature > -50) {
                        this.state.update({ temperature: temperature });
                    }
                    break;
                }
                case '0.2.85': {
                    const humidity = param.value / 100;
                    if (humidity > 0 && humidity < 100) {
                        this.state.update({ humidity: humidity });
                    }
                    break;
                }
                case '0.3.85': {
                    const pressure = param.value / 100;
                    if (pressure > 0) {
                        this.state.update({ pressure: pressure });
                    }
                    break;
                }
            }
        }
    }
}
exports.WeatherSensor = WeatherSensor;
class MotionSensor extends ChildDevice {
    constructor(did, model) {
        super(did, model);
        this.state = new state_1.DeviceState();
    }
    handleZigbeeReport(update, quality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    if (param.value === 1) {
                        this.state.update({ motion: { active: true, at: Date.now() } });
                    }
                    break;
                }
            }
        }
    }
}
exports.MotionSensor = MotionSensor;
class MagnetSensor extends ChildDevice {
    constructor(did, model) {
        super(did, model);
        this.state = new state_1.DeviceState();
    }
    handleZigbeeReport(update, quality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    this.state.update({ open: param.value === 1 });
                    break;
                }
            }
        }
    }
}
exports.MagnetSensor = MagnetSensor;
class ChildDeviceFactory {
    create(did, model) {
        switch (model) {
            case 'lumi.weather.v1':
            case 'lumi.sensor_ht': {
                return new WeatherSensor(did, model);
                break;
            }
            case 'lumi.sensor_magnet.aq2': {
                return new MagnetSensor(did, model);
                break;
            }
            case 'lumi.sensor_motion.aq2': {
                return new MotionSensor(did, model);
                break;
            }
            default: {
                console.error(`Unknown device model "${model}" for did=${did}`);
            }
        }
        return null;
    }
}
exports.ChildDeviceFactory = ChildDeviceFactory;
//# sourceMappingURL=childDevice.js.map