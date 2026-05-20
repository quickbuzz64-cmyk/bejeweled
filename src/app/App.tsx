import { RouterProvider } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { router } from './routes';
import { StoreToaster } from './components/StoreToaster';

export default function App() {
  return (
    <HelmetProvider>
      <RouterProvider router={router} />
      <StoreToaster />
    </HelmetProvider>
  );
}
