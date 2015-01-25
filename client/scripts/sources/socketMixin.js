// modified version of marty-socket.io-state-source on npm
export default function socketStateMixin() {
  return {
    open() {
      console.log('listening on socket');
      Object.keys(this.events).forEach((event) => {
        var handler = this.events[event];
        if (!handler) {
          throw new Error(`Could not find ${handler} event handler`);
        }
        this.socket.on(event, this[handler]);
      });
    },
    close() {
      console.log('unlistening on socket');
       Object.keys(this.events).forEach((event) => {
        var handler = this.events[event];
        this.socket.off(event, this[handler]);
      });
    }
  };
}
