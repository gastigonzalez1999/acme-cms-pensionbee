import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-gray-200 dark:text-gray-700 select-none">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
        Page not found
      </h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        This page doesn't exist. It may have been removed or the URL might be wrong.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        ← Back to home
      </Link>
    </div>
  );
}
