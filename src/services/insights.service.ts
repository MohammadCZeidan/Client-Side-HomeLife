import type { WeeklyInsight } from '../types';
import { apiCall } from './apiCall';

export const insightsAPI = {
  getWeeklyInsights: async (householdId: string, weekStartDate: string): Promise<WeeklyInsight> => {
    const response = await apiCall<WeeklyInsight>(`/insights/weekly?week_start_date=${weekStartDate}`);
    return response;
  },
};

