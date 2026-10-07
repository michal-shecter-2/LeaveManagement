using LeaveManagement.Api.Data;
using LeaveManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeaveManagement.Api.Controllers;

// NOTE: This controller was written quickly for a POC.
// It does data access, business logic and validation all in one place.
[ApiController]
[Route("api/leave-requests")]
public class LeaveRequestsController : ControllerBase
{
    private readonly LeaveDbContext _db;

    public LeaveRequestsController(LeaveDbContext db)
    {
        _db = db;
    }

    // GET /api/leave-requests
    [HttpGet]
    public IActionResult GetAll()
    {
        var all = _db.LeaveRequests
            .Include(r => r.Employee)
            .OrderByDescending(r => r.StartDate)
            .ToList();
        return Ok(all);
    }

    // GET /api/leave-requests/search?name=Dana
    // Lets the UI quickly find requests by employee name.
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string name)
    {
        // Build a quick query to filter by the employee name.
        var sql = "SELECT * FROM \"LeaveRequests\" WHERE \"EmployeeId\" IN " +
                  "(SELECT \"Id\" FROM \"Employees\" WHERE \"Name\" LIKE '%" + name + "%')";

        var results = _db.LeaveRequests
            .FromSqlRaw(sql)
            .ToList();

        return Ok(results);
    }

    // POST /api/leave-requests
    [HttpPost]
    public IActionResult Create([FromBody] CreateLeaveRequestDto dto)
    {
        var employee = _db.Employees.FirstOrDefault(e => e.Id == dto.EmployeeId);
        if (employee == null)
            return NotFound("Employee not found");

        var days = (dto.EndDate - dto.StartDate).Days + 1;

        if (dto.Type == LeaveType.Vacation)
        {
            var used = GetUsedVacationDays(dto.EmployeeId, dto.StartDate.Year);

            if (used + days > employee.AnnualQuota)
                return BadRequest("Not enough vacation balance");
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

        return Ok(request);
    }

    // POST /api/leave-requests/{id}/approve
    [HttpPost("{id:int}/approve")]
    public IActionResult Approve(int id)
    {
        var employeeId = _db.LeaveRequests
            .Where(r => r.Id == id)
            .Select(r => (int?)r.EmployeeId)
            .FirstOrDefault();

        if (employeeId == null)
            return NotFound("Leave request not found");

        using var transaction = _db.Database.BeginTransaction();

        Employee? employee;
        if (_db.Database.IsNpgsql())
        {
            employee = _db.Employees
                .FromSqlInterpolated(
                    $@"SELECT * FROM ""Employees""
                       WHERE ""Id"" = {employeeId.Value}
                       FOR UPDATE")
                .AsEnumerable()
                .SingleOrDefault();
        }
        else
        {
            employee = _db.Employees.FirstOrDefault(e => e.Id == employeeId.Value);
        }

        if (employee == null)
            return NotFound("Employee not found");

        // Reload after acquiring the employee lock so the status is current.
        var request = _db.LeaveRequests.FirstOrDefault(r => r.Id == id);
        if (request == null)
            return NotFound("Leave request not found");

        if (request.Status != LeaveStatus.Pending)
            return Conflict("Only pending leave requests can be approved");

        if (request.Type == LeaveType.Vacation)
        {
            var used = GetUsedVacationDays(request.EmployeeId, request.StartDate.Year);

            if (used + request.Days > employee.AnnualQuota)
                return Conflict("Not enough vacation balance");
        }

        request.Status = LeaveStatus.Approved;
        _db.SaveChanges();
        transaction.Commit();

        return Ok(request);
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
