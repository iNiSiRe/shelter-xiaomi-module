import {DeviceState} from "./state";
import {MiioDevice} from "./device";

export type HumidifierProps = {enabled?: boolean, mode?: string, temperature?: number, humidity?: number, water_level?: number};

export class Humidifier extends MiioDevice
{
    public readonly state: DeviceState<HumidifierProps> = new DeviceState<HumidifierProps>();

    constructor(
        host: string,
        token: string
    ) {
        super(host, token);

        this.syncState();
        setInterval(this.syncState.bind(this), 60000);
    }

    private async syncState()
    {
        const result = await this.call('get_prop', ["power", "mode", "temp_dec", "humidity", "depth"]);

        if (result.code !== 0) {
            console.error('Humidifier.updateProps caused an error', result);
            return;
        }

        const props: ['on'|'off', string, number, number, number] = result.data;

        this.state.update({
            enabled: props[0] === 'on',
            mode: props[1],
            temperature: props[2] / 10,
            humidity: props[3],
            water_level: Math.min(100, props[4] / 120 * 100),
        });
    }



    public async enable()
    {
        const result = await this.call('set_power', ['on']);

        if (result.code === 0 && result.data[0] === 'ok') {
            this.state.update({enabled: true});
        }
    }

    public async disable()
    {
        const result = await this.call('set_power', ['off']);

        if (result.code === 0 && result.data[0] === 'ok') {
            this.state.update({enabled: false});
        }
    }

    get props(): HumidifierProps {
        return this.state.props;
    }
}