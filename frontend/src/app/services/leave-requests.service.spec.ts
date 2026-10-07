import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CreateLeaveRequestPayload,
  LeaveRequestStatus,
  LeaveType
} from '../models/leave-request.model';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService', () => {
  let service: LeaveRequestsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(LeaveRequestsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads leave requests', () => {
    service.getAll().subscribe((requests) => expect(requests).toEqual([]));

    const request = httpMock.expectOne(
      'http://localhost:5080/api/leave-requests'
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('loads employees', () => {
    service.getEmployees().subscribe();

    const request = httpMock.expectOne('http://localhost:5080/api/employees');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a leave request', () => {
    const payload: CreateLeaveRequestPayload = {
      employeeId: 1,
      type: LeaveType.Vacation,
      startDate: '2099-10-10',
      endDate: '2099-10-12'
    };

    service.create(payload).subscribe();

    const request = httpMock.expectOne(
      'http://localhost:5080/api/leave-requests'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      id: 10,
      ...payload,
      status: LeaveRequestStatus.Pending,
      days: 3
    });
  });

  it('approves a leave request', () => {
    service.approve(10).subscribe();

    const request = httpMock.expectOne(
      'http://localhost:5080/api/leave-requests/10/approve'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({});
  });
});
