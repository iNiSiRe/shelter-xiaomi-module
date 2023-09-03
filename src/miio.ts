import UDP, {RemoteInfo, Socket} from "dgram";
import crypto from "crypto";

export class Handshake {
    public readonly completedAt: number

    constructor(
        public readonly deviceType: number,
        public readonly deviceId: number,
        public readonly timestamp: number,
    ) {
        this.completedAt = Date.now();
    }

    public createHeader(): PacketHeader
    {
        const header = new PacketHeader();
        header.deviceType = this.deviceType;
        header.deviceId = this.deviceId;
        header.timestamp = this.timestamp + Math.floor((Date.now() - this.completedAt) / 1000);

        return header;
    }

    public isFresh(): boolean
    {
        return (Date.now() - this.completedAt) < 5 * 60 * 1000;
    }
}

export interface Packet {
    bytes(): Buffer;
}

export class PacketHeader {
    private readonly data: Buffer;

    constructor() {
        this.data = Buffer.alloc(32);
        this.data.write('2131', 'hex');
    }

    get payloadLength(): number
    {
        return this.data.readUInt16BE(2) - 32;
    }

    set payloadLength(value: number)
    {
        this.data.writeUInt16BE(value + 32, 2);
    }

    get deviceType(): number
    {
        return this.data.readUInt16BE(8);
    }

    set deviceType(value: number)
    {
        this.data.writeUInt16BE(value, 8)
    }

    get deviceId(): number
    {
        return this.data.readUInt16BE(10);
    }

    set deviceId(value: number)
    {
        this.data.writeUInt16BE(value, 10)
    }

    get timestamp(): number
    {
        return this.data.readUInt32BE(12);
    }

    set timestamp(value: number)
    {
        this.data.writeUint32BE(value, 12)
    }

    get checksum(): Buffer
    {
        return this.data.subarray(16, 32);
    }

    set checksum(value: Buffer)
    {
        value.copy(this.data, 16, 0, 32);
    }

    public get bytes(): Buffer
    {
        return this.data;
    }

    public static ofBytes(bytes: Buffer): PacketHeader
    {
        if (bytes.subarray(0, 2).toString('hex') !== '2131') {
            throw new Error('Bad packet');
        }

        const header = new PacketHeader();
        bytes.copy(header.data, 0, 0, 32);

        return header;
    }
}

export class Generic {
    constructor(
        public readonly header: PacketHeader,
        public readonly secret: Buffer,
        public readonly payload: Buffer,
    ) {
    }

    public bytes(): Buffer
    {
        const key = crypto.createHash('md5').update(this.secret).digest();
        const iv = crypto.createHash('md5').update(key).update(this.secret).digest();

        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        const payloadEncrypted = Buffer.concat([
            cipher.update(this.payload),
            cipher.final()
        ]);

        this.header.checksum = this.secret;
        this.header.payloadLength = payloadEncrypted.length;

        const bytes = Buffer.concat([
            this.header.bytes,
            payloadEncrypted
        ]);

        this.header.checksum = crypto.createHash('md5').update(bytes).digest();

        return Buffer.concat([this.header.bytes, payloadEncrypted]);
    }

    public static ofBytes(bytes: Buffer, secret: Buffer): Generic
    {
        const header = PacketHeader.ofBytes(bytes.subarray(0, 32));

        const key = crypto.createHash('md5').update(secret).digest();
        const iv = crypto.createHash('md5').update(key).update(secret).digest();
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);

        const encodedPayload = bytes.subarray(32);

        let payload = Buffer.alloc(0);
        if (encodedPayload.length > 0) {
            payload = Buffer.concat([
                decipher.update(encodedPayload),
                decipher.final()
            ]);
        }

        return new Generic(header, secret, payload);
    }
}

export class DeviceCall extends Generic {
    constructor(
        id: number,
        method: string,
        params: object,
        handshake: Handshake,
        secret: Buffer
    ) {
        super(
            handshake.createHeader(),
            secret,
            Buffer.from(JSON.stringify({id: id, method: method, params: params}))
        );
    }
}

export class Hello implements Packet {
    bytes(): Buffer {
        return Buffer.from('21310020ffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex');
    }
}

type HandshakeHandler = (arg1: Handshake) => void;

enum HandshakeStatus {
    Empty = 0,
    InProgress,
    Completed,
}

export class Miio {
    private socket: Socket;
    private readonly token: Buffer;

    private handshake?: Handshake;
    private handshakeStatus: HandshakeStatus = HandshakeStatus.Empty;
    private waitingHandshake: Array<HandshakeHandler> = [];

    private waiting: Map<number, (arg: Result) => void> = new Map();

    constructor(
        private readonly host: string,
        token: string
    ) {
        this.socket = UDP.createSocket('udp4');
        this.socket.on('message', this.onSocketMessage.bind(this));

        this.token = Buffer.from(token, 'hex');
    }

    private async doHandshake(): Promise<Handshake>
    {
        if (this.handshakeStatus === HandshakeStatus.Completed) {
            if (this.handshake && this.handshake.isFresh()) {
                return this.handshake;
            } else {
                this.handshake = undefined;
                this.handshakeStatus = HandshakeStatus.Empty;
            }
        }

        if (this.handshakeStatus === HandshakeStatus.Empty) {
            this.send(new Hello());
            this.handshakeStatus = HandshakeStatus.InProgress;
        }

        return new Promise((resolve: HandshakeHandler, reject) => {
            this.waitingHandshake.push(resolve);
            setTimeout(() => {
                this.waitingHandshake.splice(this.waitingHandshake.indexOf(resolve, 0), 1);
                reject();
            }, 3000);
        });
    }

    private handleHandshake(packet: Generic): void
    {
        // console.log('Handshake received');

        this.handshake = new Handshake(packet.header.deviceType, packet.header.deviceId, packet.header.timestamp);
        this.handshakeStatus = HandshakeStatus.Completed;

        while (this.waitingHandshake.length > 0) {
            const handler = this.waitingHandshake.shift()!;
            handler(this.handshake);
        }
    }

    private onSocketMessage(message: Buffer, info: RemoteInfo): void
    {
        // console.log('<-', message.toString('hex'));

        const packet = Generic.ofBytes(message, this.token);

        if (packet.header.payloadLength === 0 && packet.header.checksum.toString('hex') === 'ffffffffffffffffffffffffffffffff') {
            this.handleHandshake(packet);
            return;
        }

        const payload: {id: number, error?: {code: number, message: string}, result?: object} = JSON.parse(packet.payload.toString());

        if (!this.waiting.has(payload.id)) {
            return;
        }

        const waiting = this.waiting.get(payload.id)!;

        waiting(new Result(payload.error ? payload.error.code : 0, payload.error ?? payload.result));
    }

    public send(packet: Packet)
    {
        // console.log('->', packet.bytes().toString('hex'));
        this.socket.send(packet.bytes(), 54321, this.host);
    }

    private async waitResult(id: number): Promise<Result>
    {
        const result = await new Promise((resolve: (arg: Result) => void) => {
            this.waiting.set(id, resolve);
            setTimeout(() => {
                resolve(new Result(-1, {error: 'Timeout'}));
            }, 5000)
        });

        this.waiting.delete(id);

        return result;
    }

    public async call(method: string, parameters: object): Promise<Result>
    {
        console.log('Call', method, parameters);

        const handshake = await this.doHandshake();

        const id = 100000000 + Math.floor(Math.random() * 999999999);
        let call = new DeviceCall(id, method, parameters, handshake, this.token);

        this.send(call);

        const result = await this.waitResult(id);
        console.log('Call result', result);

        return result;
    }
}

export class Result {
    constructor(
        public readonly code: number,
        public readonly data: any
    ) {
    }
}