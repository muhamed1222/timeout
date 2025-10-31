export interface GetEmployeesQuery {
  companyId: string;
  status?: 'active' | 'inactive' | 'terminated';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface GetEmployeesQueryResult {
  employees: Array<{
    id: string;
    companyId: string;
    fullName: string;
    position: string;
    telegramUserId?: string;
    status: string;
    timezone: string;
    createdAt: string;
    updatedAt?: string;
  }>;
  total: number;
  hasMore: boolean;
}



