import { Bus, Result } from "netbus";
import { XiaomiGateway } from "./gateway";
import { ChildDevice } from "./childDevice";
type DeviceConfig = {
    id: string;
    model?: string;
    parameters: Map<string, any>;
};
export declare class Configuration {
    devices: Array<DeviceConfig>;
    static fromFile(path: string): Configuration;
}
export interface ModuleDevice {
    get id(): string;
    get model(): string;
    get properties(): object;
    call(method: string, params: object): Promise<Result>;
}
export declare class Humidifier implements ModuleDevice {
    readonly config: DeviceConfig;
    readonly bus: Bus;
    private readonly device;
    constructor(config: DeviceConfig, bus: Bus);
    private dispatchUpdate;
    call(method: string, params: object): Promise<Result>;
    get properties(): object;
    get id(): string;
    get model(): string;
}
export declare class Gateway implements ModuleDevice {
    readonly id: string;
    readonly model: string;
    readonly device: XiaomiGateway;
    constructor(id: string, model: string, device: XiaomiGateway);
    call(method: string, params: object): Promise<Result>;
    get properties(): object;
}
export declare class GatewayChildDevice implements ModuleDevice {
    private readonly device;
    private readonly bus;
    constructor(device: ChildDevice, bus: Bus);
    call(method: string, params: object): Promise<Result>;
    get id(): string;
    get model(): string;
    get properties(): object;
    private dispatchUpdate;
}
export declare class XiaomiModule {
    private readonly bus;
    private readonly config;
    private devices;
    private startedAt;
    constructor(bus: Bus, config: Configuration);
    private loadDevice;
    setup(): Promise<void>;
    private handleDiscoverRequest;
}
export {};
