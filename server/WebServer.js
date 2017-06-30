import parseArgs from 'minimist';
import express from 'express';
import { Server } from 'http';
import GameServer from './GameServer';
import staticServe from './routes/static';

let { env } = parseArgs(process.argv.slice(2));
let port = env === 'production' ? 80 : 9000;
env = env || 'production';

// start up the game server
let app = express();
let server = Server(app);

app.set('env', env);
staticServe(app);

server.listen(port, () => {
  console.log(`Started server on port: ${port} [${env}]`);
});

let gameServer = new GameServer(server);
gameServer.start();
