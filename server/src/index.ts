import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import passport from '../auth/passport.js';
import authRoutes from '../auth/routes.js';
import { db } from '../db/index.js';
import { setupYjsWebSocket } from '../ws.js';
import documentRoutes from './routes/documents.js';


// ❌ REMOVE THIS LINE:
// import { documents } from '../db/documents.ts';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Session store in PostgreSQL
const PgSession = connectPg(session);
const sessionStore = new PgSession({
  pool: db,
  createTableIfMissing: true,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Session
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Get current user
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const { id, email, name, avatar } = req.user as any;
    res.json({ id, email, name, avatar });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const cookie = request.headers.cookie || '';
  const match = cookie.match(/connect\.sid=([^;]+)/);
  
  if (!match) {
    socket.destroy();
    return;
  }

  const sessionId = match[1];

  sessionStore.get(sessionId, (err: any, sessionData: any) => {
    if (err || !sessionData?.passport?.user) {
      socket.destroy();
      return;
    }

    (request as any).user = sessionData.passport.user;
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
});

// Initialize Yjs/WebSocket
setupYjsWebSocket(wss);

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`✅ Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Ready' : '⚠️ Missing credentials'}`);
});