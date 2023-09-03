import { ZigbeeParam, ZigbeeQuality } from "./zigbee";
import { DeviceState } from "./state";
export interface ZigbeeDevice {
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}
export type BatteryProps = {
    battery_voltage?: number;
};
export declare abstract class ChildDevice implements ZigbeeDevice {
    readonly did: string;
    readonly model: string;
    state: DeviceState<BatteryProps>;
    constructor(did: string, model: string);
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
    handleZigbeeHeartbeat(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}
type WeatherSensorProps = BatteryProps & {
    temperature?: number;
    humidity?: number;
    pressure?: number;
};
export declare class WeatherSensor extends ChildDevice {
    state: DeviceState<WeatherSensorProps>;
    constructor(did: string, model: string);
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}
type MotionSensorProps = BatteryProps & {
    motion?: {
        active: boolean;
        at: null | number;
    };
};
export declare class MotionSensor extends ChildDevice {
    state: DeviceState<MotionSensorProps>;
    constructor(did: string, model: string);
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}
type MagnetSensorProps = BatteryProps & {
    open?: boolean;
};
export declare class MagnetSensor extends ChildDevice {
    state: DeviceState<MagnetSensorProps>;
    constructor(did: string, model: string);
    handleZigbeeReport(update: ZigbeeParam[], quality: ZigbeeQuality): void;
}
export declare class ChildDeviceFactory {
    create(did: string, model: string): ChildDevice | null;
}
export {};
