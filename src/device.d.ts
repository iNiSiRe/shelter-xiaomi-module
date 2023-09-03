import { Result } from "./miio";
export type MiioInfo = {
    life: number;
    uid: number;
    model: string;
    token: string;
    mmfree: number;
    mac: string;
};
export declare class MiioDevice {
    private readonly host;
    private readonly token;
    private miio;
    constructor(host: string, token: string);
    call(method: string, params: any): Promise<Result>;
    info(): Promise<MiioInfo | false>;
}
