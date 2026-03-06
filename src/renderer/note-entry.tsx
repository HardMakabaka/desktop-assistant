import React from 'react';
import { createRoot } from 'react-dom/client';
import { NoteWindow } from './pages/NoteWindow';
import '@mdxeditor/editor/style.css';
import './styles/global.css';

const root = createRoot(document.getElementById('root')!);
root.render(<NoteWindow />);
