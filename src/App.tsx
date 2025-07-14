import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import PresentationManager from './components/PresentationManager';
import PresentationView from './components/PresentationView';

function App() {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<PresentationManager />} />
          <Route path="/presentation/:id" element={<PresentationView />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;