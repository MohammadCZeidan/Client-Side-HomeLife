import { apiCall } from './apiCall';

export const unitsAPI = {
  getAll: async (): Promise<Array<{ id: number; name: string; abbreviation: string }>> => {
    return apiCall<Array<{ id: number; name: string; abbreviation: string }>>('/units');
  },

  create: async (unit: { name: string; abbreviation: string }): Promise<{ id: number; name: string; abbreviation: string }> => {
    return apiCall<{ id: number; name: string; abbreviation: string }>('/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    });
  },
};

