import React from 'react';
import { createRoot } from 'react-dom/client';
import './desktop-api';
import { CalendarWindow } from './pages/CalendarWindow';
import './styles/global.css';

const root = createRoot(document.getElementById('root')!);
root.render(<CalendarWindow />);
