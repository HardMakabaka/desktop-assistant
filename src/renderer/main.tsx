import React from 'react';
import { createRoot } from 'react-dom/client';
import './desktop-api';
import { MainPanel } from './pages/MainPanel';
import './styles/global.css';

const root = createRoot(document.getElementById('root')!);
root.render(<MainPanel />);
