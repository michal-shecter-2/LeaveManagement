using LeaveManagement.Api.Data;
using LeaveManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LeaveManagement.Api.Services;

public enum LeaveRequestOperationStatus
{
    Success,
    EmployeeNotFound,
    RequestNotFound,
    AlreadyProcessed,
    InsufficientBalance
}

public sealed record LeaveRequestOperationResult(
    LeaveRequestOperationStatus Status,
    LeaveRequest? Request = null);

public sealed class LeaveRequestService
{
    private readonly LeaveDbContext _db;

    public LeaveRequestService(LeaveDbContext db)
    {
        _db = db;
    }

    public IReadOnlyList<LeaveRequest> GetAll()
    {
        return _db.LeaveRequests
            .Include(r => r.Employee)
            .OrderByDescending(r => r.StartDate)
            .ToList();
    }

    public IReadOnlyList<LeaveRequest> Search(string name)
    {
        var sql = "SELECT * FROM \"LeaveRequests\" WHERE \"EmployeeId\" IN " +
                  "(SELECT \"Id\" FROM \"Employees\" WHERE \"Name\" LIKE '%" + name + "%')";

        return _db.LeaveRequests
            .FromSqlRaw(sql)
            .ToList();
    }

    public LeaveRequestOperationResult Create(CreateLeaveRequestDto dto)
    {
        var employee = _db.Employees.FirstOrDefault(e => e.Id == dto.EmployeeId);
        if (employee == null)
            return new(LeaveRequestOperationStatus.EmployeeNotFound);

        var days = (dto.EndDate - dto.StartDate).Days + 1;

        if (dto.Type == LeaveType.Vacation)
        {
            var used = GetUsedVacationDays(dto.EmployeeId, dto.StartDate.Year);

            if (used + days > employee.AnnualQuota)
                return new(LeaveRequestOperationStatus.InsufficientBalance);
        }

        var request = new LeaveRequest
        {
            EmployeeId = dto.EmployeeId,
            Type = dto.Type,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Days = days,
            Status = LeaveStatus.Pending
        };

        _db.LeaveRequests.Add(request);
        _db.SaveChanges();

        return new(LeaveRequestOperationStatus.Success, request);
    }

    public LeaveRequestOperationResult Approve(int id)
    {
        var employeeId = _db.LeaveRequests
            .Where(r => r.Id == id)
            .Select(r => (int?)r.EmployeeId)
            .FirstOrDefault();

        if (employeeId == null)
            return new(LeaveRequestOperationStatus.RequestNotFound);

        using var transaction = _db.Database.BeginTransaction();

        var employee = GetEmployeeForUpdate(employeeId.Value);
        if (employee == null)
            return new(LeaveRequestOperationStatus.EmployeeNotFound);

        var request = _db.LeaveRequests.FirstOrDefault(r => r.Id == id);
        if (request == null)
            return new(LeaveRequestOperationStatus.RequestNotFound);

        if (request.Status != LeaveStatus.Pending)
            return new(LeaveRequestOperationStatus.AlreadyProcessed);

        if (request.Type == LeaveType.Vacation)
        {
            var used = GetUsedVacationDays(request.EmployeeId, request.StartDate.Year);

            if (used + request.Days > employee.AnnualQuota)
                return new(LeaveRequestOperationStatus.InsufficientBalance);
        }

        request.Status = LeaveStatus.Approved;
        _db.SaveChanges();
        transaction.Commit();

        return new(LeaveRequestOperationStatus.Success, request);
    }

    private Employee? GetEmployeeForUpdate(int employeeId)
    {
        if (!_db.Database.IsNpgsql())
            return _db.Employees.FirstOrDefault(e => e.Id == employeeId);

        return _db.Employees
            .FromSqlInterpolated(
                $@"SELECT * FROM ""Employees""
                   WHERE ""Id"" = {employeeId}
                   FOR UPDATE")
            .AsEnumerable()
            .SingleOrDefault();
    }

    private int GetUsedVacationDays(int employeeId, int year)
    {
        var yearStart = new DateTime(year, 1, 1);
        var nextYearStart = yearStart.AddYears(1);

        return _db.LeaveRequests
            .Where(r => r.EmployeeId == employeeId
                        && r.Type == LeaveType.Vacation
                        && r.Status == LeaveStatus.Approved
                        && r.StartDate >= yearStart
                        && r.StartDate < nextYearStart)
            .Sum(r => r.Days);
    }
}
