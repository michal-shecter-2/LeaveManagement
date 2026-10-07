import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateLeaveRequestPayload,
  Employee,
  LeaveRequest
} from '../models/leave-request.model';

@Injectable({ providedIn: 'root' })
export class LeaveRequestsService {
  private readonly apiUrl = 'http://localhost:5080/api';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/leave-requests`);
  }

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees`);
  }

  create(payload: CreateLeaveRequestPayload): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(
      `${this.apiUrl}/leave-requests`,
      payload
    );
  }

  approve(id: number): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(
      `${this.apiUrl}/leave-requests/${id}/approve`,
      {}
    );
  }
}
