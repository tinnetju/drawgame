import io from 'socket.io';
import PlayerManager from './PlayerManager';
import {
  SERVER_MESSAGE_EVENT,
  INIT_EVENT, NAME_CHANGE_EVENT, CHAT_EVENT, CREATE_UID_EVENT,
  DRAW_START_EVENT, DRAW_MOVE_EVENT, DRAW_END_EVENT
}
from '../common/EventConstants';

export default class GameServer {

  constructor(httpServer) {
    this.io = io(httpServer);
    this.playerManager = new PlayerManager();
  }

  sendServerMessage(message) {
    this.io.emit(SERVER_MESSAGE_EVENT, { message });
  }

  mirrorMessage(message, consolePrefix) {
    console.log(`${ consolePrefix || ''}${message}`);
    this.sendServerMessage(message);
  }

  relayEvent(socket, event) {
    socket.on(event, (data) => socket.broadcast.emit(event, data));
  }

  start() {
    this.io.on('connection', (socket) => {
      let { id } = socket;
      //connection event
      console.log(`A user(${id}) is connecting...`);

      this.listenForInitEvent(socket);
      this.listenForNameEvent(socket);
      this.listenForChatEvent(socket);
      this.listenForDrawEvents(socket);

      // disconnect event
      socket.on('disconnect', () => {
        console.log(socket.player);
        let { player: { name } } = socket;
        // name = socket.player.name;
        let message = `${name} has disconnected`;
        this.mirrorMessage(message);
      });
    });
  }

  listenForInitEvent(socket) {
    socket.on(INIT_EVENT, (data) => {
      let { id } = socket;
      if(this.playerManager.addPlayer(socket, data)) {
        socket.emit(CREATE_UID_EVENT, id);
      }
      let { player } = socket;
      let message = `${ player.name } has connected`;
      this.mirrorMessage(message, `[${ id }] `);
    });
  }

  listenForNameEvent(socket) {
    // adding or updating name
    socket.on(NAME_CHANGE_EVENT, (name) => {
      let { player } = socket;
      console.log(`${player.name} wants to change name to ${name} ...`);

      if (!name) {
        console.log('New name invalid, name not changed');
      } else {
        let oldName = player.name;
        player.name = name;

        //Tell the players a name change occurred
        let msg = `${oldName} has changed their name to ${player.name}`;
        this.mirrorMessage(msg, 'Success: ');
      }
    });
  }

  listenForChatEvent(socket) {
    socket.on(CHAT_EVENT, (msg) => {
      let { player : { name }, id } = socket;
      // player = socket.player.name;
      // id = socket.id;
      console.log(`${name}${id} said: ${msg}`);
      socket.broadcast.emit(CHAT_EVENT, { name, msg });
    });
  }

  listenForDrawEvents(socket) {
    this.relayEvent(socket, DRAW_START_EVENT);
    this.relayEvent(socket, DRAW_MOVE_EVENT);
    this.relayEvent(socket, DRAW_END_EVENT);
  }
}