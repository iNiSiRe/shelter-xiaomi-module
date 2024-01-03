import {ZigbeeParam, ZigbeeQuality} from "./zigbee";
import {CallResult, ShelterDevice, ChangeSet} from "shelter-core/module";

export interface ZigbeeDevice {
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}

export abstract class ChildDevice extends ShelterDevice implements ZigbeeDevice
{
    private readonly committed: Map<string, any> = new Map();

    constructor(
        public readonly did: string,
        public readonly model: string,
    ) {
        super(did, model);
    }

    async call(method: string, params: object): Promise<CallResult> {
        return {code: -1, data: {error: 'Bad method'}};
    }

    abstract handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;

    abstract handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}

abstract class SensorWithBattery extends ChildDevice
{
    public battery?: {voltage: number, updatedAt: number};

    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality)
    {
        this.handleZigbeeReport(update, quality);

        for (const param of update) {
            switch (param.res_name) {
                case '8.0.2008': {
                    this.battery = {voltage: param.value / 1000, updatedAt: Date.now()};
                    break;
                }
            }
        }

        this.commit();
    }
}

export class WeatherSensor extends SensorWithBattery
{
    public temperature?: number;
    public humidity?: number;
    public pressure?: number;
    public updatedAt?: number;

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {

        for (const param of update) {
            switch (param.res_name) {
                case '0.1.85': {
                    const temperature = param.value / 100;
                    if (temperature > -50) {
                        this.temperature = temperature;
                        this.updatedAt = Date.now();
                    }
                    break;
                }

                case '0.2.85': {
                    const humidity = param.value / 100;
                    if (humidity > 0 && humidity < 100) {
                        this.humidity = humidity;
                        this.updatedAt = Date.now();
                    }
                    break;
                }

                case '0.3.85': {
                    const pressure = param.value / 100;
                    if (pressure > 0) {
                        this.pressure = pressure;
                        this.updatedAt = Date.now();
                    }
                    break;
                }
            }
        }

        this.commit();
    }

    get properties(): object {
        return {
            battery: this.battery,
            temperature: this.temperature,
            humidity: this.humidity,
            pressure: this.pressure,
            updatedAt: this.updatedAt
        };
    }
}

export class MotionSensor extends SensorWithBattery
{
    public motion?: {active: boolean, at: number};

    get properties(): object {
        return {
            battery: this.battery ?? null,
            motion: this.motion ?? null
        };
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    if (param.value === 1) {
                        this.motion = {active: true, at: Date.now()};
                    }
                    break;
                }
            }
        }
        this.commit();
    }
}

export class MagnetSensor extends SensorWithBattery
{
    public magnet?: {open: boolean, updatedAt: number};

    get properties(): object {
    return {
        battery: this.battery,
        magnet: this.magnet
    };
}

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    this.magnet = {open: param.value === 1, updatedAt: Date.now()};
                    break;
                }
            }
        }
        
        this.commit();
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