import { useState, useEffect } from 'react';
import type { Document, Collaborator, User } from '../types';
interface Props {
  doc: Document;
  onClose: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function ShareModal({ doc, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<'editor' | 'viewer'>('editor');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch collaborators on mount
  useEffect(() => {
    fetchCollaborators();
  }, [doc.id]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents/${doc.id}/collaborators`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error('Failed to fetch collaborators:', err);
    }
  };

  const performSearch = async () => {
    setSearching(true);
    setError(null);
    
    try {
      const res = await fetch(
        `${API_URL}/api/documents/search-users?email=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );
      
      if (res.ok) {
        const users = await res.json();
        setSearchResults(users);
        
        if (users.length === 0) {
          setError('User not found. They need to sign in first.');
        }
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleShare = async (user: User) => {
    setSharing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`${API_URL}/api/documents/${doc.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: user.email,
          permission: selectedPermission,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(`Shared with ${user.name} as ${selectedPermission}`);
        setSearchQuery('');
        setSearchResults([]);
        fetchCollaborators(); // Refresh list
      } else {
        setError(data.error || 'Failed to share');
      }
    } catch (err) {
      setError('Failed to share. Please try again.');
      console.error('Share error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveAccess = async (userId: number) => {
    if (!confirm('Remove access for this user?')) return;
    
    try {
      const res = await fetch(
        `${API_URL}/api/documents/${doc.id}/collaborators/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      
      if (res.ok) {
        fetchCollaborators();
      } else {
        setError('Failed to remove access');
      }
    } catch (err) {
      setError('Failed to remove access');
      console.error('Remove error:', err);
    }
  };

  const getPermissionColor = (permission: string) => {
    return {
      owner: 'text-purple-600 bg-purple-100',
      editor: 'text-green-600 bg-green-100',
      viewer: 'text-blue-600 bg-blue-100',
    }[permission] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Share Document</h2>
                <p className="text-sm text-gray-600 mt-1">{doc.title}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add people by email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleShare(user)}
                      disabled={sharing}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                 transition-colors text-left disabled:opacity-50"
                    >
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      {sharing ? (
                        <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      ) : (
                        <span className="text-sm text-blue-600 font-medium">Add</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Permission Selector */}
              {searchResults.length > 0 && (
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-sm text-gray-600">Permission:</span>
                  <div className="flex gap-2">
                    {(['editor', 'viewer'] as const).map((perm) => (
                      <button
                        key={perm}
                        onClick={() => setSelectedPermission(perm)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedPermission === perm
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {perm.charAt(0).toUpperCase() + perm.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Error/Success Messages */}
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              {success && (
                <p className="mt-2 text-sm text-green-600">{success}</p>
              )}
            </div>

            {/* Collaborators List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                People with access ({collaborators.length})
              </h3>
              
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={collab.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.name)}`}
                        alt={collab.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{collab.name}</p>
                        <p className="text-sm text-gray-500">{collab.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(collab.permission)}`}>
                        {collab.permission}
                      </span>
                      
                      {/* Remove button (owner only, can't remove owner) */}
                      {doc.permission === 'owner' && collab.permission !== 'owner' && (
                        <button
                          onClick={() => handleRemoveAccess(collab.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Remove access"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              • Owners can manage all permissions<br/>
              • Editors can edit and share with others<br/>
              • Viewers can only read the document
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}