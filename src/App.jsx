import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Carte from './pages/Carte';

const Recit = lazy(() => import('./pages/Recit'));
const Horodatage = lazy(() => import('./pages/Horodatage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d20]">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#d9a441]/25 border-t-[#d9a441]" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#efe3cc]/40">Chargement</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-[#12142f] font-sans text-[#efe3cc]">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Carte />} />
            <Route path="/carte" element={<Carte />} />
            <Route path="/recit/:id" element={<Recit />} />
            <Route path="/outils/horodatage" element={<Horodatage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
