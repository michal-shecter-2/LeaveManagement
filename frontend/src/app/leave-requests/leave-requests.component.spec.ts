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
});
