import { useEffect } from 'react';
import AppRoutes from './routes';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('lr-theme');
    document.body.classList.toggle('theme-light', savedTheme === 'light');
  }, []);

  return <AppRoutes />;
}

export default App;
