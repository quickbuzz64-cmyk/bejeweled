import { toast } from 'sonner';

const base = {
  borderRadius: '3px',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.875rem',
  boxShadow: '0 4px 20px rgba(26, 10, 36, 0.12)',
  padding: '14px 16px',
};

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    style: {
      ...base,
      background: '#FFFDF5',
      border: '1px solid #C9A84C',
      color: '#1A0A24',
    },
  });
}

export function showErrorToast(message: string, description?: string) {
  toast.error(message, {
    description,
    style: {
      ...base,
      background: '#FFF8F8',
      border: '1px solid #C5807A',
      color: '#1A0A24',
    },
  });
}

export function showInfoToast(message: string, description?: string) {
  toast(message, {
    description,
    style: {
      ...base,
      background: '#FDFCFF',
      border: '1px solid #C8B5E0',
      color: '#1A0A24',
    },
  });
}

export function showWarningToast(message: string, description?: string) {
  toast.warning(message, {
    description,
    style: {
      ...base,
      background: '#FFFBF0',
      border: '1px solid #D4A84C',
      color: '#1A0A24',
    },
  });
}

export function showLoadingToast(message: string) {
  return toast.loading(message, {
    style: {
      ...base,
      background: '#FAF7FF',
      border: '1px solid #C8B5E0',
      color: '#1A0A24',
    },
  });
}

export function dismissToast(id: string | number) {
  toast.dismiss(id);
}
