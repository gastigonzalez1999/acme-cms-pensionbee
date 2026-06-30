import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import ContentPage from './components/ContentPage';

/**
 * Root application.
 *
 * Route structure:
 *   /        → HomePage (lists all available content pages dynamically)
 *   /*       → ContentPage (fetches and renders any content slug)
 *
 * The catch-all `*` route is what makes the brief's "no code changes" rule
 * work at the frontend level: a new content folder in the API is immediately
 * routable without any frontend changes.
 */
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<ContentPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
