import {Bus, Event, Result, Query} from "netbus";
import {Humidifier} from "./humidifier";
import fs from "fs";
import * as Yaml from 'js-yaml';
import {XiaomiGateway} from "./gateway";
import {ChildDevice} from "./childDevice";
import {MiioDevice} from "./device";
import {Properties, ShelterDevice, ShelterModule} from "shelter-core/module";

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

export class XiaomiModule extends ShelterModule {
    constructor(
        bus: Bus,
        private readonly config: Configuration
    ) {
        super(bus);
    }

    private async loadDevice(config: DeviceConfig) 
    {
        const host = config.parameters.get('host');
        const token = config.parameters.get('token');

        if (!config.model) {
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
                const did = config.parameters.get('did');
                
                device = new XiaomiGateway(host, token, config.id, config.model, did);
                await device.setup();

                for (const childDevice of device.getChildDevices()) {
                    this.registerDevice(childDevice);
                    console.log('Xiaomi gateway: child device is loaded', childDevice.did, childDevice.model);
                }

                break;
            }

            case 'zhimi.humidifier.ca1': {
                device = new Humidifier(config.id, config.model, host, token);

                break;
            }

            default: {
                console.log(`Xiaomi: ${config.model} isn't supported device model`);
            }
        }

        if (!device) {
            return;
        }

        this.registerDevice(device);

        console.log(`Device #${device.id} (${device.model}) is loaded`);
    }

    public async start() {
        await super.start();

        for (const config of this.config.devices) {
            await this.loadDevice(config);
        }

        console.log('Xiaomi module is ready', `Devices loaded: ${this.devices.length}`);
    }
}