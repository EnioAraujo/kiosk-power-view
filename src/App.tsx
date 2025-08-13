import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import PresentationManager from './components/PresentationManager';
import PresentationView from './components/PresentationView';
import AuthPage from './components/AuthPage';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <ThemeProvider defaultTheme="light" attribute="class">
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-lg">Carregando...</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <div className="min-h-screen bg-background">
        <Routes>
          <Route 
            path="/auth" 
            element={session ? <Navigate to="/" replace /> : <AuthPage />} 
          />
          <Route 
            path="/" 
            element={session ? <PresentationManager /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/presentation/:id" 
            element={<PresentationView />} 
          />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;