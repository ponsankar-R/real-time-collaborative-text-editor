import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { WSSharedDoc } from './utils/yjs.js';

const docs = new Map<string, WSSharedDoc>();

export function setupYjsWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: any) => {
    const room = 'default-room';
    const user = req.user;

    let doc = docs.get(room);
    if (!doc) {
      doc = new WSSharedDoc(room);
      docs.set(room, doc);
    }

    // Set user awareness
    doc.awareness?.setLocalStateField('user', {
      id: user?.id || `guest-${Date.now()}`,
      name: user?.name || 'Anonymous',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });

    doc.clients.add(ws);

    ws.on('message', (data) => {
      // Echo message back (replace with Yjs sync logic later)
      ws.send(`Echo: ${data}`);
    });

    ws.on('close', () => {
      doc.clients.delete(ws);
      if (doc.clients.size === 0) {
        doc.destroy();
        docs.delete(room);
      }
    });

    console.log(`✅ Client connected to room: ${room}`);
  });
}