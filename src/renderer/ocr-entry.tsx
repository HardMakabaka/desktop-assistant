import React from 'react';
import { createRoot } from 'react-dom/client';
import { OcrCaptureWindow } from './pages/OcrCaptureWindow';
import './styles/global.css';

const root = createRoot(document.getElementById('root')!);
root.render(<OcrCaptureWindow />);
