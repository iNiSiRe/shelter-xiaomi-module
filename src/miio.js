"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = exports.Miio = exports.Hello = exports.DeviceCall = exports.Generic = exports.PacketHeader = exports.Handshake = void 0;
const dgram_1 = __importDefault(require("dgram"));
const crypto_1 = __importDefault(require("crypto"));
class Handshake {
    constructor(deviceType, deviceId, timestamp) {
        this.deviceType = deviceType;
        this.deviceId = deviceId;
        this.timestamp = timestamp;
        this.completedAt = Date.now();
    }
    createHeader() {
        const header = new PacketHeader();
        header.deviceType = this.deviceType;
        header.deviceId = this.deviceId;
        header.timestamp = this.timestamp + Math.floor((Date.now() - this.completedAt) / 1000);
        return header;
    }
    isFresh() {
        return (Date.now() - this.completedAt) < 5 * 60 * 1000;
    }
}
exports.Handshake = Handshake;
class PacketHeader {
    constructor() {
        this.data = Buffer.alloc(32);
        this.data.write('2131', 'hex');
    }
    get payloadLength() {
        return this.data.readUInt16BE(2) - 32;
    }
    set payloadLength(value) {
        this.data.writeUInt16BE(value + 32, 2);
    }
    get deviceType() {
        return this.data.readUInt16BE(8);
    }
    set deviceType(value) {
        this.data.writeUInt16BE(value, 8);
    }
    get deviceId() {
        return this.data.readUInt16BE(10);
    }
    set deviceId(value) {
        this.data.writeUInt16BE(value, 10);
    }
    get timestamp() {
        return this.data.readUInt32BE(12);
    }
    set timestamp(value) {
        this.data.writeUint32BE(value, 12);
    }
    get checksum() {
        return this.data.subarray(16, 32);
    }
    set checksum(value) {
        value.copy(this.data, 16, 0, 32);
    }
    get bytes() {
        return this.data;
    }
    static ofBytes(bytes) {
        if (bytes.subarray(0, 2).toString('hex') !== '2131') {
            throw new Error('Bad packet');
        }
        const header = new PacketHeader();
        bytes.copy(header.data, 0, 0, 32);
        return header;
    }
}
exports.PacketHeader = PacketHeader;
class Generic {
    constructor(header, secret, payload) {
        this.header = header;
        this.secret = secret;
        this.payload = payload;
    }
    bytes() {
        const key = crypto_1.default.createHash('md5').update(this.secret).digest();
        const iv = crypto_1.default.createHash('md5').update(key).update(this.secret).digest();
        const cipher = crypto_1.default.createCipheriv('aes-128-cbc', key, iv);
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
        this.header.checksum = crypto_1.default.createHash('md5').update(bytes).digest();
        return Buffer.concat([this.header.bytes, payloadEncrypted]);
    }
    static ofBytes(bytes, secret) {
        const header = PacketHeader.ofBytes(bytes.subarray(0, 32));
        const key = crypto_1.default.createHash('md5').update(secret).digest();
        const iv = crypto_1.default.createHash('md5').update(key).update(secret).digest();
        const decipher = crypto_1.default.createDecipheriv('aes-128-cbc', key, iv);
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
exports.Generic = Generic;
class DeviceCall extends Generic {
    constructor(id, method, params, handshake, secret) {
        super(handshake.createHeader(), secret, Buffer.from(JSON.stringify({ id: id, method: method, params: params })));
    }
}
exports.DeviceCall = DeviceCall;
class Hello {
    bytes() {
        return Buffer.from('21310020ffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex');
    }
}
exports.Hello = Hello;
var HandshakeStatus;
(function (HandshakeStatus) {
    HandshakeStatus[HandshakeStatus["Empty"] = 0] = "Empty";
    HandshakeStatus[HandshakeStatus["InProgress"] = 1] = "InProgress";
    HandshakeStatus[HandshakeStatus["Completed"] = 2] = "Completed";
})(HandshakeStatus || (HandshakeStatus = {}));
class Miio {
    constructor(host, token) {
        this.host = host;
        this.handshakeStatus = HandshakeStatus.Empty;
        this.waitingHandshake = [];
        this.waiting = new Map();
        this.socket = dgram_1.default.createSocket('udp4');
        this.socket.on('message', this.onSocketMessage.bind(this));
        this.token = Buffer.from(token, 'hex');
    }
    doHandshake() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.handshakeStatus === HandshakeStatus.Completed) {
                if (this.handshake && this.handshake.isFresh()) {
                    return this.handshake;
                }
                else {
                    this.handshake = undefined;
                    this.handshakeStatus = HandshakeStatus.Empty;
                }
            }
            if (this.handshakeStatus === HandshakeStatus.Empty) {
                this.send(new Hello());
                this.handshakeStatus = HandshakeStatus.InProgress;
            }
            return new Promise((resolve, reject) => {
                this.waitingHandshake.push(resolve);
                setTimeout(() => {
                    this.waitingHandshake.splice(this.waitingHandshake.indexOf(resolve, 0), 1);
                    reject();
                }, 3000);
            });
        });
    }
    handleHandshake(packet) {
        // console.log('Handshake received');
        this.handshake = new Handshake(packet.header.deviceType, packet.header.deviceId, packet.header.timestamp);
        this.handshakeStatus = HandshakeStatus.Completed;
        while (this.waitingHandshake.length > 0) {
            const handler = this.waitingHandshake.shift();
            handler(this.handshake);
        }
    }
    onSocketMessage(message, info) {
        // console.log('<-', message.toString('hex'));
        var _a;
        const packet = Generic.ofBytes(message, this.token);
        if (packet.header.payloadLength === 0 && packet.header.checksum.toString('hex') === 'ffffffffffffffffffffffffffffffff') {
            this.handleHandshake(packet);
            return;
        }
        const payload = JSON.parse(packet.payload.toString());
        if (!this.waiting.has(payload.id)) {
            return;
        }
        const waiting = this.waiting.get(payload.id);
        waiting(new Result(payload.error ? payload.error.code : 0, (_a = payload.error) !== null && _a !== void 0 ? _a : payload.result));
    }
    send(packet) {
        // console.log('->', packet.bytes().toString('hex'));
        this.socket.send(packet.bytes(), 54321, this.host);
    }
    waitResult(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield new Promise((resolve) => {
                this.waiting.set(id, resolve);
                setTimeout(() => {
                    resolve(new Result(-1, { error: 'Timeout' }));
                }, 5000);
            });
            this.waiting.delete(id);
            return result;
        });
    }
    call(method, parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Call', method, parameters);
            const handshake = yield this.doHandshake();
            const id = 100000000 + Math.floor(Math.random() * 999999999);
            let call = new DeviceCall(id, method, parameters, handshake, this.token);
            this.send(call);
            const result = yield this.waitResult(id);
            console.log('Call result', result);
            return result;
        });
    }
}
exports.Miio = Miio;
class Result {
    constructor(code, data) {
        this.code = code;
        this.data = data;
    }
}
exports.Result = Result;
//# sourceMappingURL=miio.js.map