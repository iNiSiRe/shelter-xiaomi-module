import {ChildDevice, ChildDeviceFactory} from "./childDevice";
import {ZigbeeHeartbeat, ZigbeeObserver, ZigbeeReport} from "./zigbee";
import {MiioDevice} from "./device";
import {CallResult, ShelterDevice} from "shelter-core/module";

export class XiaomiGateway extends ShelterDevice
{
    private readonly miio: MiioDevice;

    private readonly observer: ZigbeeObserver;

    private devices: Array<ChildDevice> = [];

    private alarm: boolean = false;

    constructor(
        host: string,
        token: string,
        public readonly id: string,
        public readonly model: string,
        private readonly did: string,
        private readonly childFactory: ChildDeviceFactory = new ChildDeviceFactory()
    ) {
        super(id, model);

        this.miio = new MiioDevice(host, token);

        this.observer = new ZigbeeObserver(host);
        this.observer.on('report', this.handleReport.bind(this));
        this.observer.on('heartbeat', this.handleHeartbeat.bind(this));
    }

    get properties(): object {
        return {
            alarm: this.alarm
        };
    }

    public async setup()
    {
        this.observer.start();
        await this.loadDevices();
    }

    public getChildDevices(): Array<ChildDevice>
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
        const result = await this.miio.call('get_device_list', []);

        if (result.code !== 0) {
            return [];
        }

        return result.data;
    }

    private handleReport(report: ZigbeeReport): void
    {
        for (const device of this.devices) {
            if (device.did === report.did) {
                device.handleZigbeeReport(report.params, {rssi: report.rssi, zseq: report.zseq});
                console.log('Handle ZigbeeReport', device.did, device.model, device.properties);
            }
        }
    }

    private handleHeartbeat(heartbeat: ZigbeeHeartbeat): void
    {
        for (const update of heartbeat.params) {
            for (const device of this.devices) {
                if (device.did === update.did) {
                    device.handleZigbeeHeartbeat(update.res_list, {rssi: heartbeat.rssi, zseq: update.zseq});
                    console.log('Handle ZigbeeHeartbeat', device.did, device.model, device.properties);
                }
            }
        }
    }

    public async triggerAlarm(enable: boolean, duration: number|null = null)
    {
        const result = await this.miio.call('set_properties', [{
            did: this.did.toString(),
            siid: 3,
            piid: 22,
            value: enable ? 1 : 0
        }]);

        if (result.code === 0) {
            this.alarm = enable;
            this.commit();
        }

        if (duration !== null) {
            setTimeout(() => this.triggerAlarm(false), duration * 1000);
        }

        return result;
    }

    async call(method: string, params: object): Promise<CallResult> {
        switch (method) {
            case 'triggerAlarm': {
                const args = params as { enable?: boolean, duration?: number };

                if (args.enable === undefined) {
                    return {code: -1, data: {error: 'Bad parameter "enable"'}};
                }

                const result = await this.triggerAlarm(args.enable, args.duration ?? null);

                return {code: 0, data: {properties: this.properties}};
            }

            case 'miio.call': {
                const args = params as {method?: string, params?: any};

                if (args.method === undefined || args.params === undefined) {
                    return {code: -1, data: {error: 'Bad parameters'}};
                }

                const result = await this.miio.call(args.method, args.params);

                return {code: 0, data: result};
            }

            default: {
                return {code: -1, data: {error: 'Bad method'}};
            }
        }
    }
}