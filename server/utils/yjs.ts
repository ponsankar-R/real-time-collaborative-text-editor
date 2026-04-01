import * as Y from 'yjs';

export class WSSharedDoc extends Y.Doc {
  clients: Set<any>;
  room: string;

  constructor(room: string) {
    super();
    this.room = room;
    this.clients = new Set();
  }

  destroy() {
    this.clients.clear();
    super.destroy();
  }
}