import { DeviceState } from "./state";
import { MiioDevice } from "./device";
export type HumidifierProps = {
    enabled?: boolean;
    mode?: string;
    temperature?: number;
    humidity?: number;
    water_level?: number;
};
export declare class Humidifier extends MiioDevice {
    readonly state: DeviceState<HumidifierProps>;
    constructor(host: string, token: string);
    private syncState;
    enable(): Promise<void>;
    disable(): Promise<void>;
    get props(): HumidifierProps;
}
