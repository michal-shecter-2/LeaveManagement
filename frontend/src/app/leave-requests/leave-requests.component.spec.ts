import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeaveRequestsComponent } from './leave-requests.component';

describe('LeaveRequestsComponent', () => {
  let component: LeaveRequestsComponent;
  let fixture: ComponentFixture<LeaveRequestsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveRequestsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveRequestsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne('http://localhost:5080/api/leave-requests').flush([]);
    httpMock.expectOne('http://localhost:5080/api/employees').flush([
      { id: 1, name: 'Dana', annualQuota: 20 }
    ]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requires a leave type', () => {
    component.requestForm.setValue({
      employeeId: 1,
      type: null,
      startDate: '2026-10-10',
      endDate: '2026-10-12'
    });

    expect(component.requestForm.controls.type.hasError('required')).toBeTrue();
  });

  it('rejects a start date later than the end date', () => {
    component.requestForm.setValue({
      employeeId: 1,
      type: 0,
      startDate: '2026-10-12',
      endDate: '2026-10-10'
    });

    expect(component.requestForm.hasError('invalidDateRange')).toBeTrue();
  });

  it('submits a valid request and adds it to the list', () => {
    component.requestForm.setValue({
      employeeId: 1,
      type: 0,
      startDate: '2026-10-10',
      endDate: '2026-10-12'
    });

    component.submitRequest();

    const request = httpMock.expectOne('http://localhost:5080/api/leave-requests');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      employeeId: 1,
      type: 0,
      startDate: '2026-10-10',
      endDate: '2026-10-12'
    });

    request.flush({
      id: 10,
      employeeId: 1,
      type: 0,
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      status: 0,
      days: 3
    });

    expect(component.requests[0].employee?.name).toBe('Dana');
    expect(component.successMessage).toBe('Leave request submitted successfully.');
    expect(component.requestForm.controls.employeeId.value).toBeNull();
  });

  it('shows loading and updates only the approved request without reloading', () => {
    component.requests = [
      {
        id: 10,
        employeeId: 1,
        type: 0,
        startDate: '2026-10-10',
        endDate: '2026-10-12',
        status: 0,
        days: 3
      },
      {
        id: 11,
        employeeId: 1,
        type: 1,
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        status: 0,
        days: 1
      }
    ];

    component.approve(10);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'table button'
    );
    expect(component.approvingRequestId).toBe(10);
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Approving...');

    const request = httpMock.expectOne(
      'http://localhost:5080/api/leave-requests/10/approve'
    );
    expect(request.request.method).toBe('POST');
    request.flush({ ...component.requests[0], status: 1 });

    expect(component.approvingRequestId).toBeNull();
    expect(component.requests[0].status).toBe(1);
    expect(component.requests[1].status).toBe(0);
    expect(component.approvalSuccess).toBe(
      'Leave request approved successfully.'
    );
    httpMock.expectNone('http://localhost:5080/api/leave-requests');
  });

  it('shows the server error and clears loading when approval fails', () => {
    component.requests = [
      {
        id: 10,
        employeeId: 1,
        type: 0,
        startDate: '2026-10-10',
        endDate: '2026-10-12',
        status: 0,
        days: 3
      }
    ];

    component.approve(10);
    const request = httpMock.expectOne(
      'http://localhost:5080/api/leave-requests/10/approve'
    );
    request.flush('Only pending leave requests can be approved', {
      status: 409,
      statusText: 'Conflict'
    });

    expect(component.approvingRequestId).toBeNull();
    expect(component.requests[0].status).toBe(0);
    expect(component.approvalError).toBe(
      'Only pending leave requests can be approved'
    );
    expect(component.approvalSuccess).toBeNull();
  });
});
