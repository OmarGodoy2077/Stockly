export const config = {
  api: {
    baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api/v1',
    timeout: 15000,
  },
  auth: {
    tokenKey: 'stockly_token',
    refreshTokenKey: 'stockly_refresh_token',
    tokenExpiryKey: 'stockly_token_expiry',
  },
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    acceptedDocTypes: ['application/pdf'],
  },
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50, 100],
  },
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  currency: {
    locale: 'es-PE',
    options: {
      style: 'currency',
      currency: 'PEN',
    },
  },
} as const;