import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import ContentPage from './components/ContentPage';
import SubscribePage from './components/SubscribePage';

/**
 * Root application.
 *
 * Route structure:
 *   /            → HomePage (lists all available content pages dynamically)
 *   /subscribe   → SubscribePage (RSS landing page)
 *   /*           → ContentPage (fetches and renders any content slug)
 *
 * /subscribe is matched before the catch-all `*` route (React Router tries
 * specific paths first). The catch-all is what makes the brief's "no code
 * changes" rule work at the frontend level: a new content folder in the API
 * is immediately routable without any frontend changes.
 */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="*" element={<ContentPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
