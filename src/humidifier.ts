import { CallResult, ShelterDevice } from "shelter-core/module";
import { MiioDevice } from "./device";

export class Humidifier extends ShelterDevice
{
    private readonly miio: MiioDevice;

    public enabled: boolean = false;
    public mode: string = 'off';
    public temperature: number = 0;
    public humidity: number = 0;
    public waterLevel: number = 0;
    public updatedAt: number = 0;

    constructor(
        public readonly id: string,
        public readonly model: string,
        host: string,
        token: string
    ) {
        super(id, model);

        this.miio = new MiioDevice(host, token);

        this.loadState();

        setInterval(async () => {
            this.loadState();
        }, 60000);
    }

    get properties(): object {
        return {
            enabled: this.enabled,
            mode: this.mode,
            temperature: this.temperature,
            humidity: this.humidity,
            waterLevel: this.waterLevel,
            updatedAt: this.updatedAt
        };
    }

    private async loadState()
    {
        const result = await this.miio.call('get_prop', ["power", "mode", "temp_dec", "humidity", "depth"]);

        if (result.code !== 0) {
            console.error('Humidifier.loadState caused an error', result);
            return;
        }

        const props: ['on'|'off', string, number, number, number] = result.data;

        this.enabled = props[0] === 'on';
        this.mode = props[1];
        this.temperature = props[2] / 10;
        this.humidity = props[3];
        this.waterLevel = Math.min(100, props[4] / 120 * 100);
        this.updatedAt = Date.now();

        this.commit();
    }

    public async enable()
    {
        const result = await this.miio.call('set_power', ['on']);

        if (result.code === 0 && result.data[0] === 'ok') {
            this.enabled = true;
            this.commit();
        }
    }

    public async disable()
    {
        const result = await this.miio.call('set_power', ['off']);

        if (result.code === 0 && result.data[0] === 'ok') {
            this.enabled = false;
            this.commit();
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

        return {
            code: 0,
            data: {
                properties: this.properties
            }
        };
    }
}