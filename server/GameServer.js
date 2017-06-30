import io from 'socket.io';
import AppState from '../common/AppState';
import createGame from '../common/Game';
import createPlayer from '../common/Player';

import {addPlayerToGame, removePlayerFromGame, addChatMessage} from '../common/modules/game';
import {addPlayer, removePlayer} from '../common/modules/players';

import {
  SERVER_MESSAGE_EVENT, REQUEST_GAMES,
  NAME_CHANGE_EVENT, JOIN_GAME_EVENT, LEAVE_GAME_EVENT, CHAT_EVENT,
  PATH_START_EVENT, PATH_MOVE_EVENT, PATH_END_EVENT,
  INIT_EVENT_LOBBY, INIT_EVENT_GAME,
  ACTION,
  NAME_ERROR, JOIN_GAME_ERROR, UNEXPECTED_ERROR
}
from '../common/EventConstants';

export default class GameServer {

  constructor(httpServer) {
    this.io = io(httpServer);
    this.state = new AppState();
    
    //Create some test data
    let g1 = createGame('5', 'Test game');
    let g2 = createGame('6', 'Test game 2').set('password', 'test');
    this.state.addGame(g1);
    this.state.addGame(g2);
    let p1 = createPlayer('10', 'Bob');
    let p2 = createPlayer('11', 'Bobert');
    this.state.addPlayer(p1);
    this.state.addPlayer(p2);
    this.state.addPlayerToGame(g1.get('id'), p1.get('id'));
    this.state.addPlayerToGame(g1.get('id'), p2.get('id'));
  }

  start() {
    this.io.on('connection', (socket) => {
      let { id } = socket;
      console.log(`A user[${id}] is connecting...`);

      this.listenForInitEvent(socket);

      // disconnect event
      socket.on('disconnect', () => {
        //if they are in a game
        //  remove player from socket.io room
        //  dispatch player leave game
        //dispatch remove player
        let player = this.state.getPlayer(socket.id);
        let name = player !== undefined ? player.get('name') : 'someone';
        let message = `${name} has disconnected`;
        console.log(message);
      });
    });
  }

  listenForInitEvent(socket) {
    let _this = this;
    function initPlayer(data, cb){
      let playerId = socket.id;
      let { name } = data;
      let nameError = _this.checkNameError(name);
      if(nameError != undefined){
        cb(nameError);
        return;
      }
      //TODO: It should be very very unlikely but this should be updated to give the client a new unique id
      if(_this.state.getPlayer(playerId) != undefined){
        cb({err: _this.createError(UNEXPECTED_ERROR, 'Unexpected Error', 'Please refresh you\'re browser.')});
        return;
      }
      let p = createPlayer(playerId, name);
      _this.state.addPlayer(p);
      let action = addPlayer(p.toJS());
      socket.broadcast.emit(ACTION, [action]);

      socket.removeAllListeners('LOGIN');

      _this.listenForNameEvent(socket);
      _this.listenForJoinEvent(socket);
      _this.listenForGamesRequest(socket);
      _this.listenForChatEvent(socket);
      _this.listenForLeaveEvent(socket);

      const games = _this.state.games.valueSeq().toJS();
      const players = _this.state.players.toJS();
      if(data.gameId === undefined){
        let res = {
          playerId,
          players,
          games
        };
        cb(res);
      }else{
        let joinError = _this.joinGame(data.gameId, playerId);
        if(joinError !== undefined){
          cb(joinError);
          return;
        }

        let game = _this.state.getGame(data.gameId).toJS();
        let res = {
          playerId,
          players,
          game
        };
        cb(res);
      }
      let message = `${ name }[${ playerId }] has connected`;
      console.log(message);
    }
    socket.on('LOGIN', (data, cb) => {
      initPlayer(data, cb);
    });
  }

  listenForGamesRequest(socket){
    socket.on(REQUEST_GAMES, (data, cb) => {
      cb({games: this.state.games.valueSeq().toJS()});
    });
  }

  listenForNameEvent(socket) {
    socket.on(NAME_CHANGE_EVENT, (name, cb) => {
      let playerId = socket.id;
      let player = this.state.getPlayer(playerId);
      if(player != undefined){
        console.log(`${player.get('name')} wants to change name to ${name} ...`);

        let nameError = this.checkNameError(name);
        if (nameError != undefined) {
          cb(nameError);
          return;
        }
        let oldName = player.name;
        player.name = name;

        //Tell the players a name change occurred
        console.log(`${oldName} has changed their name to ${name}`);
        this.io.emit(NAME_CHANGE_EVENT, {
          id: playerId,
          newName: name
        });
      }else{
        console.error('Player not found in NAME_CHANGE_EVENT');
      }
    });
  }

  listenForJoinEvent(socket){
    socket.on(JOIN_GAME_EVENT, (data, cb) => {
      let joinError = this.joinGame(data.gameId, socket);
      if(joinError !== undefined){
        cb(joinError);
        return;
      }

      let game = this.state.getGame(data.gameId);
      cb({game: game});

    });
  }

  listenForLeaveEvent(socket) {
    socket.on(LEAVE_GAME_EVENT, () => {
      let gameId = this.state.getPlayer(socket.id).get('gameId');
      if(gameId !== undefined){
        let action = removePlayerFromGame(socket.id);
        this.state.removePlayerFromGame(gameId, socket.id);
        socket.to(gameId).emit(ACTION, [action]);
      }
    });
  }

  listenForChatEvent(socket) {
    socket.on(CHAT_EVENT, (message) => {
      let playerId = socket.id;
      let gameId = this.state.getPlayer(playerId).get('gameId');
      if(gameId !== undefined){
        let action = addChatMessage(this.state.getPlayer(playerId).get('name'), message);
        this.io.to(gameId).emit(ACTION, [action]);
      }
    });
  }

  listenForPathEvents(socket) {
    
  }

  joinGame(gameId, socket){
    let game = this.state.getGame(gameId);
    if(game === undefined){
      return {err: this.createError(JOIN_GAME_ERROR, 'Error joining game', 'Could not find the game requested')};
    }

    let oldGameId = this.state.getPlayer(socket.id).get('gameId');
    if(oldGameId != undefined){
      let a = removePlayerFromGame(socket.id);
      this.state.removePlayerFromGame(oldGameId, socket.id);
      socket.to(oldGameId).emit(ACTION, [a]);
    }
    let action = addPlayerToGame(socket.id);
    this.state.addPlayerToGame(gameId, socket.id);
    socket.join(gameId);
    socket.to(gameId).emit(ACTION, [action]);
    return undefined; //No errors
  }

  // Error Checking

  checkNameError(name){
    if(!this.isValidName(name)){
      return {err: this.createError(NAME_ERROR,
        'Invalid Name',
        'The name you\'ve entered is invalid, please try again.')
      };
    }
    if(!this.isNameAvailable(name)){
      return {err: this.createError(NAME_ERROR,
        'Name Taken',
        'The name you\'ve entered is already in use, please try again.')
      };
    }
    return undefined; //No errors
  }

  isValidName(name){
    return typeof name === 'string' && name !== '';
  }

  isNameAvailable(name){
    let players = this.state.players;
    let nameTaken = false;
    players.forEach(p => {
      if(p.name === name){
        nameTaken = true; //TODO: Stop the loop if we find a match
      }
    })
    return !nameTaken;
  }

  createError(errType, title, msg){
    return {
      type: errType,
      title: title,
      msg: msg
    };
  }
}
