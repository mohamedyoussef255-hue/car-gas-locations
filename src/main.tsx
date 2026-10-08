import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Permanently block browser robotic SpeechSynthesis
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak = () => {};
  } catch {}
}

createRoot(document.getElementById('root')!).render(<App />);
