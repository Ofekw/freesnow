import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { UnitsProvider } from './context/UnitsContext';
import { TimezoneProvider } from './context/TimezoneContext';
import { App } from './App';
import './styles/index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UnitsProvider>
      <TimezoneProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TimezoneProvider>
    </UnitsProvider>
  </React.StrictMode>,
);
