import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CreateLeaveRequestPayload,
  Employee,
  LeaveRequest
} from '../models/leave-request.model';

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value as string | null;
  const endDate = control.get('endDate')?.value as string | null;

  if (!startDate || !endDate) return null;

  return startDate <= endDate ? null : { invalidDateRange: true };
}

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.css']
})
export class LeaveRequestsComponent implements OnInit {
  requests: LeaveRequest[] = [];
  employees: Employee[] = [];
  loading = false;
  submitting = false;
  submitError: string | null = null;
  successMessage: string | null = null;

  private apiUrl = 'http://localhost:5080/api/leave-requests';
  private employeesUrl = 'http://localhost:5080/api/employees';
  private formBuilder = inject(FormBuilder);

  requestForm = this.formBuilder.group(
    {
      employeeId: [null as number | null, Validators.required],
      type: [null as number | null, Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    },
    { validators: dateRangeValidator }
  );

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
    this.loadEmployees();
  }

  load(): void {
    this.loading = true;
    this.http.get<LeaveRequest[]>(this.apiUrl).subscribe((data) => {
      this.requests = data;
      this.loading = false;
    });
  }

  loadEmployees(): void {
    this.http.get<Employee[]>(this.employeesUrl).subscribe({
      next: (employees) => {
        this.employees = employees;
      },
      error: () => {
        this.submitError = 'Could not load employees. Please try again.';
      }
    });
  }

  submitRequest(): void {
    this.submitError = null;
    this.successMessage = null;

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

    this.submitting = true;
    this.http
      .post<LeaveRequest>(this.apiUrl, payload)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (createdRequest) => {
          const employee = this.employees.find(
            (item) => item.id === createdRequest.employeeId
          );

          this.requests = [{ ...createdRequest, employee }, ...this.requests];
          this.successMessage = 'Leave request submitted successfully.';
          this.requestForm.reset();
        },
        error: (error: HttpErrorResponse) => {
          this.submitError =
            typeof error.error === 'string'
              ? error.error
              : 'Could not submit the request. Please try again.';
        }
      });
  }

  // Wired up by the candidate as part of the assignment.
  approve(id: number): void {
    // TODO (candidate): call POST /api/leave-requests/{id}/approve
    // and handle loading / error / success without a generic alert.
    this.http.post<LeaveRequest>(this.apiUrl + '/' + id + '/approve', {}).subscribe(() => {
      this.load();
    });
  }

  typeLabel(type: number): string {
    if (type == 0) return 'Vacation';
    if (type == 1) return 'Sick';
    return 'Unpaid';
  }

  statusLabel(status: number): string {
    if (status == 0) return 'Pending';
    if (status == 1) return 'Approved';
    return 'Rejected';
  }
}
