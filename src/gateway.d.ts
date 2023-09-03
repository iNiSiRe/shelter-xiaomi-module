import { ChildDevice, ChildDeviceFactory } from "./childDevice";
import { ZigbeeHeartbeat, ZigbeeReport } from "./zigbee";
import { MiioDevice } from "./device";
export declare class XiaomiGateway extends MiioDevice {
    private readonly childFactory;
    private readonly observer;
    private devices;
    constructor(host: string, token: string, childFactory?: ChildDeviceFactory);
    setup(): Promise<void>;
    getSubDevices(): Array<ChildDevice>;
    private loadDevices;
    private getDeviceList;
    handleReport(report: ZigbeeReport): void;
    handleHeartbeat(heartbeat: ZigbeeHeartbeat): void;
}
