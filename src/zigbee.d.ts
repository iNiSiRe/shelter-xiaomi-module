/// <reference types="node" />
import { EventEmitter } from "events";
export type ZigbeeQuality = {
    rssi: number;
    zseq: number;
};
export type ZigbeeParam = {
    res_name: string;
    value: any;
};
export type ZigbeeReport = {
    id: number;
    time: number;
    rssi: number;
    zseq: number;
    did: string;
    params: [ZigbeeParam];
};
export type ZigbeeHeartbeat = {
    id: number;
    time: number;
    rssi: number;
    params: [{
        did: string;
        zseq: number;
        res_list: [ZigbeeParam];
    }];
};
export declare class ZigbeeObserver extends EventEmitter {
    private readonly host;
    private connection?;
    constructor(host: string);
    start(): void;
    private handleMessage;
}
