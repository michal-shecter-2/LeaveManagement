import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CreateLeaveRequestPayload,
  Employee,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType
} from '../models/leave-request.model';
import { LeaveRequestsService } from '../services/leave-requests.service';

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value as string | null;
  const endDate = control.get('endDate')?.value as string | null;

  if (!startDate || !endDate) return null;

  return startDate <= endDate ? null : { invalidDateRange: true };
}

function notBeforeDateValidator(minDate: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;

    if (!value) return null;

    return value >= minDate ? null : { pastDate: true };
  };
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.css']
})
export class LeaveRequestsComponent implements OnInit {
  readonly requests = signal<LeaveRequest[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly approvingRequestId = signal<number | null>(null);
  readonly approvalError = signal<string | null>(null);
  readonly approvalSuccess = signal<string | null>(null);
  readonly today = toDateInputValue(new Date());
  readonly LeaveType = LeaveType;
  readonly LeaveRequestStatus = LeaveRequestStatus;

  private readonly leaveRequestsService = inject(LeaveRequestsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  requestForm = this.formBuilder.group(
    {
      employeeId: [null as number | null, Validators.required],
      type: [null as LeaveType | null, Validators.required],
      startDate: [
        '',
        [Validators.required, notBeforeDateValidator(this.today)]
      ],
      endDate: [
        '',
        [Validators.required, notBeforeDateValidator(this.today)]
      ]
    },
    { validators: dateRangeValidator }
  );

  ngOnInit(): void {
    this.load();
    this.loadEmployees();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.leaveRequestsService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (requests) => this.requests.set(requests),
        error: () => {
          this.loadError.set('Could not load leave requests. Please try again.');
        }
      });
  }

  loadEmployees(): void {
    this.leaveRequestsService
      .getEmployees()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employees) => this.employees.set(employees),
        error: () => {
          this.submitError.set('Could not load employees. Please try again.');
        }
      });
  }

  submitRequest(): void {
    this.submitError.set(null);
    this.successMessage.set(null);

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const payload: CreateLeaveRequestPayload = {
      employeeId: this.requestForm.controls.employeeId.value!,
      type: this.requestForm.controls.type.value!,
      startDate: this.requestForm.controls.startDate.value!,
      endDate: this.requestForm.controls.endDate.value!
    };

    this.submitting.set(true);
    this.leaveRequestsService
      .create(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: (createdRequest) => {
          const employee = this.employees().find(
            (item) => item.id === createdRequest.employeeId
          );

          this.requests.update((requests) => [
            { ...createdRequest, employee },
            ...requests
          ]);
          this.successMessage.set('Leave request submitted successfully.');
          this.requestForm.reset();
        },
        error: (error: HttpErrorResponse) => {
          this.submitError.set(
            typeof error.error === 'string'
              ? error.error
              : 'Could not submit the request. Please try again.'
          );
        }
      });
  }

  approve(id: number): void {
    if (this.approvingRequestId() !== null) return;

    this.approvalError.set(null);
    this.approvalSuccess.set(null);
    this.approvingRequestId.set(id);

    this.leaveRequestsService
      .approve(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.approvingRequestId.set(null))
      )
      .subscribe({
        next: (approvedRequest) => {
          this.requests.update((requests) =>
            requests.map((request) =>
              request.id === approvedRequest.id
                ? { ...request, status: approvedRequest.status }
                : request
            )
          );
          this.approvalSuccess.set('Leave request approved successfully.');
        },
        error: (error: HttpErrorResponse) => {
          this.approvalError.set(this.getApprovalError(error));
        }
      });
  }

  private getApprovalError(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.status === 404) return 'Leave request was not found.';
    if (error.status === 409) {
      return 'The request could not be approved because its state has changed.';
    }

    return 'Could not approve the leave request. Please try again.';
  }

  typeLabel(type: LeaveType): string {
    if (type === LeaveType.Vacation) return 'Vacation';
    if (type === LeaveType.Sick) return 'Sick';
    return 'Unpaid';
  }

  statusLabel(status: LeaveRequestStatus): string {
    if (status === LeaveRequestStatus.Pending) return 'Pending';
    if (status === LeaveRequestStatus.Approved) return 'Approved';
    return 'Rejected';
  }
}
