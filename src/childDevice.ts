import {ZigbeeParam, ZigbeeQuality} from "./zigbee";
import {DeviceState} from "./state";

export interface ZigbeeDevice {
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}

export type BatteryProps = {battery_voltage?: number};

export abstract class ChildDevice implements ZigbeeDevice
{
    public state: DeviceState<BatteryProps>;

    constructor(
        public readonly did: string,
        public readonly model: string,
    ) {
        this.state = new DeviceState<BatteryProps>();
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality)
    {
    }

    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality)
    {
        for (const param of update) {
            switch (param.res_name) {
                case '8.0.2008': {
                    const voltage = param.value / 1000;
                    this.state.update({battery_voltage: voltage});
                    break;
                }
            }
        }
    }
}

type WeatherSensorProps = BatteryProps & {temperature?: number, humidity?: number, pressure?: number};

export class WeatherSensor extends ChildDevice
{
    public state: DeviceState<WeatherSensorProps>;

    constructor(did: string, model: string) {
        super(did, model);
        this.state = new DeviceState<WeatherSensorProps>();
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        super.handleZigbeeReport(update, quality);

        for (const param of update) {
            switch (param.res_name) {
                case '0.1.85': {
                    const temperature = param.value / 100;
                    if (temperature > -50) {
                        this.state.update({temperature: temperature});
                    }
                    break;
                }

                case '0.2.85': {
                    const humidity = param.value / 100;
                    if (humidity > 0 && humidity < 100) {
                        this.state.update({humidity: humidity});
                    }
                    break;
                }

                case '0.3.85': {
                    const pressure = param.value / 100;
                    if (pressure > 0) {
                        this.state.update({pressure: pressure});
                    }
                    break;
                }
            }
        }
    }
}

type MotionSensorProps = BatteryProps & {motion?: {active: boolean, at: null|number}};

export class MotionSensor extends ChildDevice {

    public state: DeviceState<MotionSensorProps>;

    constructor(did: string, model: string) {
        super(did, model);
        this.state = new DeviceState<MotionSensorProps>();
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    if (param.value === 1) {
                        this.state.update({motion: {active: true, at: Date.now()}});
                    }
                    break;
                }
            }
        }
    }
}

type MagnetSensorProps = BatteryProps & {open?: boolean};

export class MagnetSensor extends ChildDevice
{
    public state: DeviceState<MagnetSensorProps>;

    constructor(did: string, model: string) {
        super(did, model);
        this.state = new DeviceState<MagnetSensorProps>();
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    this.state.update({open: param.value === 1});
                    break;
                }
            }
        }
    }
}

export class ChildDeviceFactory
{
    public create(did: string, model: string): ChildDevice|null {
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