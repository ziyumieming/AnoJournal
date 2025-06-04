import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.tsx';
import DiaryPage from './pages/DiaryPage.tsx';
import FrontPage from './pages/FrontPage.tsx';

function App() {
  return (
    <BrowserRouter>
      {/* <Navbar /> */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/frontpage" element={<FrontPage />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;