import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.ts';
import companyReducer from './companySlice.ts';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    company: companyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
