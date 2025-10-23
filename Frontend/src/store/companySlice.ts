import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Company } from '../types';

interface CompanyState {
  activeCompany: Company | null;
  companies: Company[];
}

const initialState: CompanyState = {
  activeCompany: null,
  companies: [],
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setActiveCompany(state, action: PayloadAction<Company>) {
      state.activeCompany = action.payload;
    },
    setCompanies(state, action: PayloadAction<Company[]>) {
      state.companies = action.payload;
    },
  },
});

export const { setActiveCompany, setCompanies } = companySlice.actions;
export default companySlice.reducer;
