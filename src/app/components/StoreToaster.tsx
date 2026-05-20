import { Toaster } from 'sonner';

export function StoreToaster() {
  return (
    <Toaster
      position="top-right"
      gap={8}
      toastOptions={{
        duration: 4500,
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          borderRadius: '3px',
          background: '#FFFFFF',
          color: '#1A0A24',
          border: '1px solid #E8D5F5',
          boxShadow: '0 4px 20px rgba(26, 10, 36, 0.10)',
          padding: '14px 16px',
        },
        classNames: {
          title: 'bejeweled-toast-title',
          description: 'bejeweled-toast-desc',
        },
      }}
    />
  );
}
