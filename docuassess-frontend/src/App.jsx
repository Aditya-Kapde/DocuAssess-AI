import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import ConfigurePage from './pages/ConfigurePage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/configure" element={<ConfigurePage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </Layout>

        {/* Toast notifications — top-right, dark themed */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1A1A2E',
              color: '#E8E8F0',
              border: '1px solid #2E2E4A',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            },
            success: {
              iconTheme: {
                primary: '#22C55E',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  );
}
