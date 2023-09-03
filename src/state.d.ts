/// <reference types="node" />
import { EventEmitter } from "events";
export declare class ChangeSet extends Map<string, any> {
}
export declare class DeviceState<Scheme extends object> extends EventEmitter {
    private readonly state;
    update(changes: Scheme): void;
    get props(): Scheme;
}
