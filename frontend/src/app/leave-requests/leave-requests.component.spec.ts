import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType
} from '../models/leave-request.model';
import { LeaveRequestsService } from '../services/leave-requests.service';
import { LeaveRequestsComponent } from './leave-requests.component';

describe('LeaveRequestsComponent', () => {
  let component: LeaveRequestsComponent;
  let fixture: ComponentFixture<LeaveRequestsComponent>;
  let service: jasmine.SpyObj<LeaveRequestsService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<LeaveRequestsService>(
      'LeaveRequestsService',
      ['getAll', 'getEmployees', 'create', 'approve']
    );
    service.getAll.and.returnValue(of([]));
    service.getEmployees.and.returnValue(
      of([{ id: 1, name: 'Dana', annualQuota: 20 }])
    );

    await TestBed.configureTestingModule({
      imports: [LeaveRequestsComponent],
      providers: [{ provide: LeaveRequestsService, useValue: service }]
    }).compileComponents();

    fixture = TestBed.createComponent(LeaveRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires a leave type', () => {
    component.requestForm.setValue({
      employeeId: 1,
      type: null,
      startDate: '2099-10-10',
      endDate: '2099-10-12'
    });

    expect(component.requestForm.controls.type.hasError('required')).toBeTrue();
  });

  it('rejects a start date later than the end date', () => {
    component.requestForm.setValue({
      employeeId: 1,
      type: LeaveType.Vacation,
      startDate: '2099-10-12',
      endDate: '2099-10-10'
    });

    expect(component.requestForm.hasError('invalidDateRange')).toBeTrue();
  });

  it('rejects leave dates in the past', () => {
    component.requestForm.setValue({
      employeeId: 1,
      type: LeaveType.Vacation,
      startDate: '2000-01-01',
      endDate: '2000-01-02'
    });

    expect(component.requestForm.controls.startDate.hasError('pastDate')).toBeTrue();
    expect(component.requestForm.controls.endDate.hasError('pastDate')).toBeTrue();
    expect(component.requestForm.invalid).toBeTrue();
  });

  it('submits a valid request and adds it to the list', () => {
    const createdRequest: LeaveRequest = {
      id: 10,
      employeeId: 1,
      type: LeaveType.Vacation,
      startDate: '2099-10-10',
      endDate: '2099-10-12',
      status: LeaveRequestStatus.Pending,
      days: 3
    };
    service.create.and.returnValue(of(createdRequest));
    component.requestForm.setValue({
      employeeId: 1,
      type: LeaveType.Vacation,
      startDate: '2099-10-10',
      endDate: '2099-10-12'
    });

    component.submitRequest();

    expect(service.create).toHaveBeenCalledWith({
      employeeId: 1,
      type: LeaveType.Vacation,
      startDate: '2099-10-10',
      endDate: '2099-10-12'
    });
    expect(component.requests()[0].employee?.name).toBe('Dana');
    expect(component.successMessage()).toBe(
      'Leave request submitted successfully.'
    );
    expect(component.requestForm.controls.employeeId.value).toBeNull();
  });

  it('shows loading and updates only the approved request without reloading', () => {
    const approval = new Subject<LeaveRequest>();
    service.approve.and.returnValue(approval);
    component.requests.set([
      createRequest(10, LeaveRequestStatus.Pending),
      createRequest(11, LeaveRequestStatus.Pending)
    ]);

    component.approve(10);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      'table button'
    );
    expect(component.approvingRequestId()).toBe(10);
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Approving...');

    approval.next(createRequest(10, LeaveRequestStatus.Approved));
    approval.complete();

    expect(component.approvingRequestId()).toBeNull();
    expect(component.requests()[0].status).toBe(
      LeaveRequestStatus.Approved
    );
    expect(component.requests()[1].status).toBe(LeaveRequestStatus.Pending);
    expect(component.approvalSuccess()).toBe(
      'Leave request approved successfully.'
    );
    expect(service.getAll).toHaveBeenCalledTimes(1);
  });

  it('shows the server error and clears loading when approval fails', () => {
    service.approve.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: 'Only pending leave requests can be approved',
            status: 409,
            statusText: 'Conflict'
          })
      )
    );
    component.requests.set([
      createRequest(10, LeaveRequestStatus.Pending)
    ]);

    component.approve(10);

    expect(component.approvingRequestId()).toBeNull();
    expect(component.requests()[0].status).toBe(LeaveRequestStatus.Pending);
    expect(component.approvalError()).toBe(
      'Only pending leave requests can be approved'
    );
    expect(component.approvalSuccess()).toBeNull();
  });
});

function createRequest(
  id: number,
  status: LeaveRequestStatus
): LeaveRequest {
  return {
    id,
    employeeId: 1,
    type: LeaveType.Vacation,
    startDate: '2099-10-10',
    endDate: '2099-10-12',
    status,
    days: 3
  };
}
