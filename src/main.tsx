import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './config/env'; // Validate environment variables at startup
import './index.css';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
