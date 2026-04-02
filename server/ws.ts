import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { encoding, decoding } from 'lib0';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import { WSSharedDoc } from './utils/yjs.js';
import { documents } from './db/documents.js';

// Store: roomId -> Yjs document
const yDocs = new Map<string, { doc: WSSharedDoc; wsClients: Set<WebSocket> }>();

export function setupYjsWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: any) => {
    // Extract document ID from URL: /ws?doc=uuid-here
    const url = new URL(req.url, `http://${req.headers.host}`);
    const docId = url.searchParams.get('doc');
    
    if (!docId) {
      ws.close(1008, 'Document ID required');
      return;
    }

    const user = req.user;
    if (!user) {
      ws.close(1008, 'Authentication required');
      return;
    }

    const roomId = `doc:${docId}`;
    
    // Get or create Yjs document for this room
    let room = yDocs.get(roomId);
    if (!room) {
      const yDoc = new WSSharedDoc(roomId);
      
      // Initialize with content from DB if first load
      documents.getById(docId, (user as any).id).then((doc: any) => {
        if (doc?.content) {
          try {
            const yText = yDoc.getText('content');
            if (yText.length === 0 && doc.content) {
              // Convert JSON content to Yjs if needed
              yDoc.applyUpdate(Y.encodeStateAsUpdate(yDoc));
            }
          } catch (e) {
            console.error('Failed to load document content:', e);
          }
        }
      });
      
      room = { doc: yDoc, wsClients: new Set() };
      yDocs.set(roomId, room);
    }

    const { doc: yDoc, wsClients } = room;
    wsClients.add(ws);

    // Set awareness state with user info
    yDoc.awareness.setLocalStateField('user', {
      id: (user as any).id,
      name: (user as any).name || 'Anonymous',
      email: (user as any).email,
      avatar: (user as any).avatar,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    });

    // Handle incoming messages
    const messageHandler = (data: ArrayBuffer) => {
      const message = new Uint8Array(data);
      const decoder = decoding.createDecoder(message);
      const encoder = encoding.createEncoder();
      
      const messageType = decoding.readVarUint(decoder);
      
      switch (messageType) {
        case syncProtocol.messageYjsSyncStep1:
        case syncProtocol.messageYjsSyncStep2:
        case syncProtocol.messageYjsUpdate:
          syncProtocol.readSyncMessage(decoder, encoder, yDoc, null);
          
          // Log activity for "last edited" indicator
          if (messageType === syncProtocol.messageYjsUpdate) {
            documents.logActivity(docId, (user as any).id, 'edit').catch(console.error);
          }
          break;
          
        case awarenessProtocol.messageAwareness:
          awarenessProtocol.applyAwarenessUpdate(
            yDoc.awareness,
            decoding.readVarUint8Array(decoder),
            ws
          );
          break;
      }
      
      // Send response if needed
      if (encoding.length(encoder) > 0) {
        ws.send(encoding.toUint8Array(encoder));
      }
    };

    ws.on('message', messageHandler);

    // Send initial sync
    const syncEncoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(syncEncoder, yDoc);
    ws.send(encoding.toUint8Array(syncEncoder));

    // Send current awareness states
    const awarenessState = awarenessProtocol.encodeAwarenessUpdate(
      yDoc.awareness,
      Array.from(yDoc.awareness.getStates().keys())
    );
    ws.send(awarenessState);

    // Handle disconnect
    const closeHandler = () => {
      awarenessProtocol.removeAwarenessStates(
        yDoc.awareness,
        [yDoc.awareness.clientID],
        'disconnect'
      );
      wsClients.delete(ws);
      ws.removeListener('message', messageHandler);
      ws.removeListener('close', closeHandler);
      
      // Clean up empty rooms
      if (wsClients.size === 0) {
        // Persist to DB before cleanup
        try {
          const content = Y.encodeStateAsUpdate(yDoc);
          documents.updateContent(docId, { type: 'yjs-update', data: Buffer.from(content).toString('base64') })
            .catch(console.error);
        } catch (e) {
          console.error('Failed to persist document:', e);
        }
        
        yDoc.destroy();
        yDocs.delete(roomId);
      }
    };

    ws.on('close', closeHandler);
    ws.on('error', closeHandler);

    console.log(`🔌 User ${(user as any).name} connected to document ${docId}`);
  });

  // Optional: Periodic persistence for all active documents
  setInterval(() => {
    for (const [roomId, { doc: yDoc }] of yDocs) {
      const docId = roomId.replace('doc:', '');
      try {
        const content = Y.encodeStateAsUpdate(yDoc);
        documents.updateContent(docId, { type: 'yjs-update', data: Buffer.from(content).toString('base64') })
          .catch(console.error);
      } catch (e) {
        console.error(`Failed to persist ${docId}:`, e);
      }
    }
  }, 30000); // Every 30 seconds
}