import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f5f7fb; color: #12182b; }
  button, input, select, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);