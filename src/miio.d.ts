/// <reference types="node" />
export declare class Handshake {
    readonly deviceType: number;
    readonly deviceId: number;
    readonly timestamp: number;
    readonly completedAt: number;
    constructor(deviceType: number, deviceId: number, timestamp: number);
    createHeader(): PacketHeader;
    isFresh(): boolean;
}
export interface Packet {
    bytes(): Buffer;
}
export declare class PacketHeader {
    private readonly data;
    constructor();
    get payloadLength(): number;
    set payloadLength(value: number);
    get deviceType(): number;
    set deviceType(value: number);
    get deviceId(): number;
    set deviceId(value: number);
    get timestamp(): number;
    set timestamp(value: number);
    get checksum(): Buffer;
    set checksum(value: Buffer);
    get bytes(): Buffer;
    static ofBytes(bytes: Buffer): PacketHeader;
}
export declare class Generic {
    readonly header: PacketHeader;
    readonly secret: Buffer;
    readonly payload: Buffer;
    constructor(header: PacketHeader, secret: Buffer, payload: Buffer);
    bytes(): Buffer;
    static ofBytes(bytes: Buffer, secret: Buffer): Generic;
}
export declare class DeviceCall extends Generic {
    constructor(id: number, method: string, params: object, handshake: Handshake, secret: Buffer);
}
export declare class Hello implements Packet {
    bytes(): Buffer;
}
export declare class Miio {
    private readonly host;
    private socket;
    private readonly token;
    private handshake?;
    private handshakeStatus;
    private waitingHandshake;
    private waiting;
    constructor(host: string, token: string);
    private doHandshake;
    private handleHandshake;
    private onSocketMessage;
    send(packet: Packet): void;
    private waitResult;
    call(method: string, parameters: object): Promise<Result>;
}
export declare class Result {
    readonly code: number;
    readonly data: any;
    constructor(code: number, data: any);
}
