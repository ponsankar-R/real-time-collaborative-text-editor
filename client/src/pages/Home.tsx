import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Document, User } from '../types/index.js';
import { CreateDocumentModal } from '../components/CreateDocumentModal';
import { ShareModal } from '../components/ShareModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (title: string) => {
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title }),
      });
      
      if (res.ok) {
        const newDoc = await res.json();
        setShowCreateModal(false);
        fetchDocuments(); // Refresh list
        navigate(`/editor/${newDoc.id}`);
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleOpenEditor = (docId: string) => {
    navigate(`/editor/${docId}`);
  };

  const handleShareClick = (doc: Document) => {
    setSelectedDoc(doc);
    setShowShareModal(true);
  };

  const getPermissionBadge = (permission: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      editor: 'bg-green-100 text-green-800',
      viewer: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[permission]}`}>
        {permission.charAt(0).toUpperCase() + permission.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="text-gray-600 mt-1">
            {user?.name}, you have {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Document
        </button>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No documents yet</h3>
          <p className="mt-2 text-gray-600">Create your first document to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg 
                         transition-shadow cursor-pointer group"
              onClick={() => handleOpenEditor(doc.id)}
            >
              {/* Document Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </div>
                {getPermissionBadge(doc.permission)}
              </div>

              {/* Owner Info */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={doc.owner_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.owner_name)}`}
                  alt={doc.owner_name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="text-sm">
                  <p className="text-gray-700">{doc.owner_name}</p>
                  <p className="text-gray-500 text-xs">Owner</p>
                </div>
              </div>

              {/* Collaborators */}
              {doc.collaborator_count > 1 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(3, doc.collaborator_count - 1))].map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    +{doc.collaborator_count - 1} collaborator{doc.collaborator_count > 2 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareClick(doc);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 
                             rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Add more actions menu here
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateDocumentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDocument}
        />
      )}
      
      {showShareModal && selectedDoc && (
        <ShareModal
          doc={selectedDoc}
          onClose={() => {
            setShowShareModal(false);
            setSelectedDoc(null);
            fetchDocuments(); // Refresh to show updated collaborator count
          }}
        />
      )}
    </div>
  );
}