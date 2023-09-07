import { CallResult, DeviceState, ShelterDevice } from "shelter-core/module";
import {MiioDevice} from "./device";

export type HumidifierProps = {enabled: boolean, mode: string, temperature: number, humidity: number, water_level: number};

export class Humidifier implements ShelterDevice<HumidifierProps>
{
    private readonly miio: MiioDevice;

    public state: DeviceState<HumidifierProps> = new DeviceState({enabled: false, mode: 'off', temperature: 0, humidity: 0, water_level: 0})

    constructor(
        public readonly id: string,
        public readonly model: string,
        host: string,
        token: string
    ) {
        this.miio = new MiioDevice(host, token);

        this.loadState().then(properties => {
            if (properties !== false) {
                this.state.properties = properties;
                this.state.commit();
            }
        });

        setInterval(async () => {
            const properties = await this.loadState();
            if (properties !== false) {
                this.state.properties = properties;
                this.state.commit();
            }
        }, 60000);
    }

    private async loadState()
    {
        const result = await this.miio.call('get_prop', ["power", "mode", "temp_dec", "humidity", "depth"]);

        if (result.code !== 0) {
            console.error('Humidifier.loadState caused an error', result);
            return false;
        }

        const props: ['on'|'off', string, number, number, number] = result.data;

        return {
            enabled: props[0] === 'on',
            mode: props[1],
            temperature: props[2] / 10,
            humidity: props[3],
            water_level: Math.min(100, props[4] / 120 * 100),
        };
    }

    public async enable()
    {
        const result = await this.miio.call('set_power', ['on']);

        if (result.code === 0 && result.data[0] === 'ok') {
            this.state.properties.enabled = true;
            this.state.commit();
        }
    }

    public async disable()
    {
        const result = await this.miio.call('set_power', ['off']);

        if (result.code === 0 && result.data[0] === 'ok') {
            this.state.properties.enabled = false;
            this.state.commit();
        }
    }

    async call(method: string, params: object): Promise<CallResult> 
    {
        switch (method) {
            case 'enable': {
                await this.enable();
                break;
            }
            case 'disable': {
                await this.disable();
                break;
            }
            default: {
                return {code: -1, data: {error: 'Bad method'}};
            }
        }

        return {code: 0, data: {
            properties: this.state.properties
        }};
    }
}