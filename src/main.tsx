import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutProvider } from './contexts/LayoutContext';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LayoutProvider>
      <App />
    </LayoutProvider>
  </StrictMode>
);
