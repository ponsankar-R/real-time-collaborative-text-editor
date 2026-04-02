import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import Editor from './pages/Editor';
import { UserMenu } from './components/UserMenu';

function App() {
  console.log('✅ App component is rendering!'); // Debug log
  
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Test div to verify rendering */}
        <div style={{ background: 'red', color: 'white', padding: '20px' }}>
          DEBUG: App is rendering!
        </div>
        
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button 
              onClick={() => window.location.href = '/'}
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              ✏️ Collab
            </button>
            <UserMenu />
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-16 min-h-screen bg-gray-50">
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:docId"
              element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              }
            />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;