import {Bus, Event, Result, Query} from "netbus";
import {Humidifier as XiaomiHumidifier} from "./humidifier";
import fs from "fs";
import * as Yaml from 'js-yaml';
import {XiaomiGateway} from "./gateway";
import {ChangeSet} from "./state";
import {ChildDevice} from "./childDevice";
import {MiioDevice} from "./device";

type DeviceConfig = { id: string, model?: string, parameters: Map<string, any> };

export class Configuration {
    public devices: Array<DeviceConfig> = [];

    public static fromFile(path: string): Configuration {
        const config = new Configuration();

        const data = fs.readFileSync(path);

        const yaml = Yaml.load(data.toString()) as { devices: [{ id: string, model: string, parameters: object }] };

        for (const device of yaml.devices) {
            const params: Map<string, any> = new Map(Object.entries(device.parameters));
            config.devices.push({id: device.id, parameters: params});
        }

        return config;
    }
}

export interface ModuleDevice
{
    get id(): string;

    get model(): string;

    get properties(): object;

    call(method: string, params: object): Promise<Result>;
}

export class Humidifier implements ModuleDevice
{
    private readonly device: XiaomiHumidifier;

    constructor(
        public readonly config: DeviceConfig,
        public readonly bus: Bus
    ) {
        const host = config.parameters.get('host');
        const token = config.parameters.get('token');
        this.device = new XiaomiHumidifier(host, token);
        this.device.state.on('update', this.dispatchUpdate.bind(this));
    }

    private dispatchUpdate(changed: ChangeSet): void {
        this.bus.dispatch({
            name: 'Device.Update',
            data: {device: this.id, update: Object.fromEntries(changed.entries()), properties: this.device.props}
        });
    }

    async call(method: string, params: object): Promise<Result> {
        switch (method) {
            case 'enable': {
                await this.device.enable();
                break;
            }
            case 'disable': {
                await this.device.disable();
                break;
            }
        }

        return new Result(0, this.properties);
    }

    get properties(): object {
        return this.device.props;
    }

    get id(): string {
        return this.config.id;
    }

    get model(): string {
        return this.config.model ?? '';
    }
}

export class Gateway implements ModuleDevice
{
    constructor(
        public readonly id: string,
        public readonly model: string,
        public readonly device: XiaomiGateway
    ) {
    }

    async call(method: string, params: object): Promise<Result> {
        return new Result(-1, {});
    }

    get properties(): object {
        return {};
    }
}

export class GatewayChildDevice implements ModuleDevice
{
    constructor(
        private readonly device: ChildDevice,
        private readonly bus: Bus
    ) {
        device.state.on('update', this.dispatchUpdate.bind(this));
    }

    call(method: string, params: object): Promise<Result> {
        return Promise.resolve(new Result(-1, {error: 'Method not exists'}));
    }

    get id(): string {
        return this.device.did;
    }

    get model(): string {
        return this.device.model;
    }

    get properties(): object {
        return this.device.state.props;
    }

    private dispatchUpdate(changes: ChangeSet) {
        this.bus.dispatch({
            name: 'Device.Update',
            data: {device: this.id, update: Object.fromEntries(changes.entries()), properties: this.properties}
        });
    }
}

export class XiaomiModule
{
    private devices: ModuleDevice[] = [];

    private startedAt: number = 0;

    constructor(
        private readonly bus: Bus,
        private readonly config: Configuration
    ) {
        this.bus.subscribe('Discover.Request', this.handleDiscoverRequest.bind(this));

        this.bus.on('Module.Status', async (query: Query): Promise<Result> => {
            const FormatMemoryUsage = (data: number) => Math.round((data / 1024 / 1024) * 100) / 100;

            return new Result(0, {
                uptime: Math.floor((Date.now() - this.startedAt) / 1000),
                memory: FormatMemoryUsage(process.memoryUsage().rss)
            });
        });

        this.bus.on('Device.Call', async (query: Query): Promise<Result> => {
            const call: { device: string, method: string, parameters: object } = query.data;

            for (const device of this.devices) {
                if (device.id === call.device) {
                    return device.call(call.method, call.parameters);
                }
            }

            return new Result(-1, {error: 'Device not found'});
        });
    }

    private async loadDevice(config: DeviceConfig)
    {
        if (!config.model) {
            const host = config.parameters.get('host');
            const token = config.parameters.get('token');

            const miio = new MiioDevice(host, token)
            const info = await miio.info()

            if (info === false) {
                console.error('Xiaomi: Cant load device info', config.id);
                return;
            }

            config.model = info.model;
        }

        let device = null;

        switch (config.model) {
            case 'lumi.gateway.mgl03': {
                const host = config.parameters.get('host');
                const token = config.parameters.get('token');
                const gateway = new XiaomiGateway(host, token);
                await gateway.setup();
                device = new Gateway(config.id, config.model, gateway);

                for (const subDevice of gateway.getSubDevices()) {
                    this.devices.push(new GatewayChildDevice(subDevice, this.bus));
                    console.log('Xiaomi gateway: child device is loaded', subDevice.did, device.model);
                }

                break;
            }

            case 'zhimi.humidifier.ca1': {
                device = new Humidifier(config, this.bus);

                break;
            }

            default: {
                console.log(`Xiaomi: ${config.model} isn't supported device model`);
            }
        }

        if (!device) {
            return;
        }

        this.devices.push(device);

        console.log(`Device #${device.id} (${device.model}) is loaded`);
    }

    public async setup() {
        for (const config of this.config.devices) {
            await this.loadDevice(config);
        }

        console.log('Xiaomi module is ready', `Devices loaded: ${this.devices.length}`);

        this.startedAt = Date.now();
    }

    private handleDiscoverRequest(): void {
        for (const device of this.devices) {
            this.bus.dispatch(new Event('Discover.Response', {
                device: device.id,
                model: device.model,
                properties: device.properties
            }));
        }
    }
}