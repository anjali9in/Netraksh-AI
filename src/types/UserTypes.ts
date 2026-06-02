export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export type User = {
  employeeId: string;
  fullName: string;
  department?: string;
  designation?: string;
  siteId?: string;
  phone?: string;
  email?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};
