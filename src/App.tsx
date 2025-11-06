import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginForm from './components/LoginForm';
import AdminLayout from './components/AdminLayout';
import VideoManager from './components/VideoManager';
import VideoPlayer from './components/VideoPlayer';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Rotas administrativas */}
        <Route
          path="/admin"
          element={
            user ? (
              <AdminLayout>
                <VideoManager />
              </AdminLayout>
            ) : (
              <LoginForm />
            )
          }
        />
        
        {/* Rota para vídeos por slug */}
        <Route
          path="/:slug"
          element={<VideoPlayer slug={window.location.pathname.substring(1)} />}
        />
        
        {/* Redirecionamento da página inicial */}
        <Route
          path="/"
          element={<Navigate to="/admin" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;