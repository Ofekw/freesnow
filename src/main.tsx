import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UnitsProvider } from './context/UnitsContext';
import { App } from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UnitsProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UnitsProvider>
  </React.StrictMode>,
);
