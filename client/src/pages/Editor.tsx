import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { AwarenessUser } from '../types/index.js';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = API_URL.replace('http', 'ws');

export default function Editor() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<AwarenessUser[]>([]);
  const [content, setContent] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<any>(null);

  useEffect(() => {
    if (!docId) return;
    
    const fetchDoc = async () => {
      try {
        const res = await fetch(`${API_URL}/api/documents/${docId}`, {
          credentials: 'include',
        });
        
        if (res.status === 404) {
          navigate('/');
          return;
        }
        
        if (!res.ok) throw new Error('Failed to fetch document');
        
        const data = await res.json();
        setDoc(data);
        setIsReadOnly(data.permission === 'viewer');
        
        initYjs(data.id);
      } catch (err) {
        console.error('Failed to load document:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoc();
    
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (yDocRef.current) {
        yDocRef.current.destroy();
      }
    };
  }, [docId, navigate]);

  const initYjs = useCallback((documentId: string) => {
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;
    
    const provider = new WebsocketProvider(
      WS_URL,
      `doc:${documentId}`,
      yDoc,
      {
        connect: true,
        awareness: true,
      }
    );
    providerRef.current = provider;
    
    const awareness = provider.awareness;
    awarenessRef.current = awareness;
    
    if (user) {
      awareness.setLocalStateField('user', {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      });
    }
    
    awareness.on('change', ({ added, updated, removed }: any) => {
      const states = awareness.getStates();
      const users: AwarenessUser[] = [];
      
      for (const [clientId, state] of states) {
        if (state.user && clientId !== awareness.clientID) {
          users.push({
            ...state.user,
            cursor: state.cursor,
            line: state.line,
          });
        }
      }
      
      setCollaborators(users);
    });
    
    const yText = yDoc.getText('content');
    setContent(yText.toString());
    
    yText.observe((event) => {
      setContent(yText.toString());
      
      if (editorRef.current) {
        const cursorPos = editorRef.current.selectionStart;
        awareness.setLocalStateField('cursor', {
          start: cursorPos,
          end: editorRef.current.selectionEnd,
        });
        
        const textBefore = yText.toString().substring(0, cursorPos);
        const lineNumber = (textBefore.match(/\n/g) || []).length + 1;
        awareness.setLocalStateField('line', lineNumber);
      }
    }, yDoc);
    
    if (editorRef.current && !isReadOnly) {
      editorRef.current.value = yText.toString();
    }
  }, [user, isReadOnly]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const yDoc = yDocRef.current;
    const yText = yDoc?.getText('content');
    
    if (yText && !isReadOnly) {
      const currentContent = yText.toString();
      
      if (newContent !== currentContent) {
        yDoc?.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, newContent);
        });
      }
    }
    
    if (awarenessRef.current && editorRef.current) {
      const cursorPos = editorRef.current.selectionStart;
      awarenessRef.current.setLocalStateField('cursor', {
        start: cursorPos,
        end: editorRef.current.selectionEnd,
      });
      
      const textBefore = newContent.substring(0, cursorPos);
      const lineNumber = (textBefore.match(/\n/g) || []).length + 1;
      awarenessRef.current.setLocalStateField('line', lineNumber);
    }
  }, [isReadOnly]);

  const lineNumbers = content.split('\n').map((_, i) => i + 1);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500"></div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-gray-600">
        Document not found
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={doc.title}
            onChange={(e) => {/* Add title update logic */}}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none 
                       focus:ring-0 focus:border-none outline-none"
            disabled={doc.permission !== 'owner'}
          />
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            doc.permission === 'owner' ? 'bg-purple-100 text-purple-800' :
            doc.permission === 'editor' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {doc.permission}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {collaborators.map((collab, idx) => (
            <div
              key={collab.id}
              className="relative group"
              title={`${collab.name} - ${collab.email}`}
            >
              <img
                src={collab.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name)}`}
                alt={collab.name}
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ borderColor: collab.color }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
                            bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 
                            transition-opacity whitespace-nowrap pointer-events-none z-10">
                <p className="font-medium">{collab.name}</p>
                <p className="text-gray-300">{collab.email}</p>
                {collab.line && (
                  <p className="text-gray-400">Editing line {collab.line}</p>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 
                              border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          ))}
          
          {user && (
            <div className="relative group">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-blue-500 shadow-sm"
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
                            bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 
                            transition-opacity whitespace-nowrap pointer-events-none z-10">
                <p className="font-medium">{user.name} (You)</p>
                <p className="text-gray-300">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-gray-50">
        <div className="w-12 flex-shrink-0 bg-gray-100 border-r border-gray-200 
                        text-right text-sm text-gray-500 select-none overflow-hidden">
          <div className="p-4 font-mono">
            {lineNumbers.map((num) => (
              <div key={num} className="h-6 leading-6">
                {num}
              </div>
            ))}
          </div>
        </div>
        
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleContentChange}
          onSelect={() => {
            if (editorRef.current && awarenessRef.current) {
              const cursorPos = editorRef.current.selectionStart;
              awarenessRef.current.setLocalStateField('cursor', {
                start: cursorPos,
                end: editorRef.current.selectionEnd,
              });
              
              const textBefore = content.substring(0, cursorPos);
              const lineNumber = (textBefore.match(/\n/g) || []).length + 1;
              awarenessRef.current.setLocalStateField('line', lineNumber);
            }
          }}
          readOnly={isReadOnly}
          className="flex-1 p-4 font-mono text-sm bg-transparent outline-none resize-none 
                     focus:ring-0 leading-6"
          placeholder="Start typing..."
          spellCheck={false}
        />
      </div>

      <div className="px-6 py-2 border-t border-gray-200 bg-white text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>{content.length} characters</span>
          <span>{content.split(/\s+/).filter(Boolean).length} words</span>
          <span>{lineNumbers.length} lines</span>
        </div>
        <div className="flex items-center gap-2">
          {isReadOnly && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">View Only</span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {collaborators.length + 1} online
          </span>
        </div>
      </div>
    </div>
  );
}