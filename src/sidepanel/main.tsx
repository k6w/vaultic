import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyThemeSync } from '@shared/theme';
import '../styles/global.css';

// Apply a theme before first paint to avoid a flash; the hook refines it.
applyThemeSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
