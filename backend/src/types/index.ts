import { Role } from '../types/enums';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  centreId?: string | null;
  districtId?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface CsvCandidate {
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  courseName: string;
  trainingCentre: string;
  completionDate: string;
}

