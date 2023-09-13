import {Connector} from "netbus";
import {Configuration, XiaomiModule} from "./module";

const busId: string = process.env.BUS_ID ?? '';
const busHost: string = process.env.BUS ?? '';
const configPath: string = process.env.CONFIG ?? '';

if (busId === '' || busHost === '' || configPath === '') {
    console.error('Not enough arguments! Usage: BUS_ID=xiaomi BUS=127.0.0.1 CONFIG=xiaomi.yml node xiaomi/module.js');
    process.exit(-1);
}

(async () => {
    const bus = await Connector.connect(busId, busHost);
    const module = new XiaomiModule(bus, Configuration.fromFile(configPath))
    await module.start();
})();

process.on('exit', code => {
    console.log(`Process exited with code: ${code}`)
    console.trace();
})

process.on('uncaughtException', err => {
    console.log(`Uncaught Exception: ${err.message}`)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at ', promise, reason)
    process.exit(1)
})