import {ZigbeeParam, ZigbeeQuality} from "./zigbee";
import {CallResult, DeviceState, Properties, ShelterDevice} from "shelter-core/module";

export interface ZigbeeDevice {
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}

export abstract class ChildDevice<T extends object> implements ZigbeeDevice, ShelterDevice<T>
{
    constructor(
        public readonly did: string,
        public readonly model: string,
        public readonly state: DeviceState<T>
    ) {
    }
    
    get id(): string
    {
        return this.did;
    }

    async call(method: string, params: object): Promise<CallResult> {
        return {code: -1, data: {error: 'Bad method'}};
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality)
    {
    }

    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality)
    {
    }
}

export type BatteryProps = {battery_voltage: number};

export class BatteryDevice<T extends BatteryProps> extends ChildDevice<T>
{
    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality)
    {
        for (const param of update) {
            switch (param.res_name) {
                case '8.0.2008': {
                    this.state.properties.battery_voltage = param.value / 1000;
                    break;
                }
            }
        }

        this.state.commit();
    }
}

type WeatherSensorProps = BatteryProps & {temperature: number, humidity: number, pressure: number};

export class WeatherSensor extends BatteryDevice<WeatherSensorProps>
{
    constructor(did: string, model: string) {
        super(
            did, 
            model, 
            new DeviceState({temperature: 0, humidity: 0, pressure: 0, battery_voltage: 0})
        );
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        super.handleZigbeeReport(update, quality);

        for (const param of update) {
            switch (param.res_name) {
                case '0.1.85': {
                    const temperature = param.value / 100;
                    if (temperature > -50) {
                        this.state.properties.temperature = temperature;
                    }
                    break;
                }

                case '0.2.85': {
                    const humidity = param.value / 100;
                    if (humidity > 0 && humidity < 100) {
                        this.state.properties.humidity = humidity;
                    }
                    break;
                }

                case '0.3.85': {
                    const pressure = param.value / 100;
                    if (pressure > 0) {
                        this.state.properties.pressure = pressure;
                    }
                    break;
                }
            }
        }

        this.state.commit();
    }
}

type MotionSensorProps = BatteryProps & {motion: {active: boolean, at: null|number}};

export class MotionSensor extends ChildDevice<MotionSensorProps> {

    constructor(did: string, model: string) {
        super(
            did, 
            model,
            new DeviceState({motion: {active: false, at: null}, battery_voltage: 0})
        );
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    if (param.value === 1) {
                        this.state.properties.motion = {active: true, at: Date.now()};
                    }
                    break;
                }
            }
        }
        this.state.commit();
    }
}

type MagnetSensorProps = BatteryProps & {open: boolean};

export class MagnetSensor extends ChildDevice<MagnetSensorProps>
{
    constructor(did: string, model: string) {
        super(
            did, 
            model,
            new DeviceState({open: false, battery_voltage: 0})
        );
    }

    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality) {
        for (const param of update) {
            switch (param.res_name) {
                case '3.1.85': {
                    this.state.properties.open = param.value === 1;
                    break;
                }
            }
        }
        
        this.state.commit();
    }
}

export class ChildDeviceFactory
{
    public create(did: string, model: string): ChildDevice<any>|null {
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