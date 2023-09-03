import {WeatherSensor, MagnetSensor, MotionSensor, ChildDevice, ChildDeviceFactory} from "./childDevice";
import {ZigbeeHeartbeat, ZigbeeObserver, ZigbeeReport} from "./zigbee";
import {MiioDevice} from "./device";
import {EventEmitter} from "events";

export class XiaomiGateway extends MiioDevice
{
    private readonly observer: ZigbeeObserver;

    private devices: Array<ChildDevice> = [];

    constructor(
        host: string,
        token: string,
        private readonly childFactory: ChildDeviceFactory = new ChildDeviceFactory()
    ) {
        super(host, token);
        this.observer = new ZigbeeObserver(host);
        this.observer.on('report', this.handleReport.bind(this));
        this.observer.on('heartbeat', this.handleHeartbeat.bind(this));
    }

    public async setup()
    {
        this.observer.start();
        await this.loadDevices();
    }

    public getSubDevices(): Array<ChildDevice>
    {
        return this.devices;
    }

    private async loadDevices()
    {
        this.devices = [];
        let total = 0;
        let loaded = 0;

        do {
            const list = await this.getDeviceList();

            if (list.length > 0) {
                total = list[0].total;
            }

            loaded += list.length;

            for (const subDevice of list) {
                const device = this.childFactory.create(subDevice.did, subDevice.model);

                if (!device) {
                    continue;
                }

                this.devices.push(device);
            }
        } while (loaded < total);

        console.log('Xiaomi gateway: child devices loaded', `count=${this.devices.length}`);
    }

    private async getDeviceList(): Promise<Array<{did: string, model: string, num: number, total: number}>>
    {
        const result = await this.call('get_device_list', []);

        if (result.code !== 0) {
            return [];
        }

        return result.data;
    }

    public handleReport(report: ZigbeeReport): void
    {
        for (const device of this.devices) {
            if (device.did === report.did) {
                device.handleZigbeeReport(report.params, {rssi: report.rssi, zseq: report.zseq});
                console.log('Handle ZigbeeReport', device.did, device.model, device.state.props);
            }
        }
    }

    public handleHeartbeat(heartbeat: ZigbeeHeartbeat): void
    {
        for (const update of heartbeat.params) {
            for (const device of this.devices) {
                if (device.did === update.did) {
                    device.handleZigbeeHeartbeat(update.res_list, {rssi: heartbeat.rssi, zseq: update.zseq});
                    console.log('Handle ZigbeeHeartbeat', device.did, device.model, device.state.props);
                }
            }
        }
    }
}