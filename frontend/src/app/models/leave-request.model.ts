export enum LeaveType {
  Vacation = 0,
  Sick = 1,
  Unpaid = 2
}

export enum LeaveRequestStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2
}

export interface Employee {
  id: number;
  name: string;
  annualQuota: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  // Populated by the API on reads; absent on the response to a create.
  employee?: Employee;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus;
  days: number;
}

export interface CreateLeaveRequestPayload {
  employeeId: number;
  type: LeaveType;
  startDate: string;
  endDate: string;
}
