import {EventEmitter} from "events";

export class ChangeSet extends Map<string,any>
{
}

export class DeviceState<Scheme extends object> extends EventEmitter
{
    private readonly state: Map<string, any> = new Map();

    public update(changes: Scheme): void
    {
        const changed = new ChangeSet();

        for (const [name, value] of Object.entries(changes)) {
            if (this.state.has(name) && this.state.get(name) === value) {
                continue;
            }

            this.state.set(name, value);
            changed.set(name, value);
        }

        if (changed.size > 0) {
            this.emit('update', changed);
        }
    }

    public get props(): Scheme {
        const object: { [key: string]: any } = {};

        for (const [name, value] of this.state) {
            object[name] = value;
        }

        return object as Scheme;
    }
}