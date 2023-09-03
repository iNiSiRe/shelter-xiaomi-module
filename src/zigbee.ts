import {EventEmitter} from "events";
import * as mqtt from "mqtt";

export type ZigbeeQuality = {rssi: number, zseq: number};
export type ZigbeeParam = { res_name: string, value: any };
export type ZigbeeReport = {id: number, time: number, rssi: number, zseq: number, did: string, params: [ZigbeeParam]};
export type ZigbeeHeartbeat = {id: number, time: number, rssi: number, params: [{did: string, zseq: number, res_list: [ZigbeeParam]}]};

export class ZigbeeObserver extends EventEmitter
{
    private connection?: mqtt.MqttClient;

    constructor(
        private readonly host: string
    ) {
        super();
    }

    public start(): void
    {
        if (this.connection !== undefined) {
            console.error('Started already');
            return;
        }

        this.connection = mqtt.connect('mqtt://' + this.host);
        this.connection.on('message', this.handleMessage.bind(this));
        this.connection.subscribe('zigbee/send');
    }

    private handleMessage(topic: string, message: Buffer)
    {
        const object = JSON.parse(message.toString());
        const zigbeeMessage: {cmd: string} = object;

        console.log(zigbeeMessage);

        switch (zigbeeMessage.cmd) {
            case 'report': {
                const report: ZigbeeReport = object;

                const params: Map<string,any> = new Map();
                for (const param of report.params) {
                    params.set(param.res_name, param.value);
                }

                this.emit('report', report);

                break;
            }
            case 'heartbeat': {
                const heartbeat: ZigbeeHeartbeat = object;
                this.emit('heartbeat', heartbeat);
                break;
            }
            default: {
                console.log('Unexpected zigbee message: ', zigbeeMessage);
            }
        }
    }
}