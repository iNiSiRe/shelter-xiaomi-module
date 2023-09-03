import {Miio, Result} from "./miio";

export type MiioInfo = {life: number, uid: number, model: string, token: string, mmfree: number, mac: string};

export class MiioDevice
{
    private miio: Miio;

    constructor(
        private readonly host: string,
        private readonly token: string
    ) {
        this.miio = new Miio(host, token);
    }

    public async call(method: string, params: any): Promise<Result>
    {
        return this.miio.call(method, params);
    }

    public async info(): Promise<MiioInfo|false>
    {
        const result= await this.call('miIO.info', []);

        if (result.code !== 0) {
            return false;
        }

        return result.data;
    }
}