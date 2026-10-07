using LeaveManagement.Api.Controllers;
using LeaveManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace LeaveManagement.Tests;

public class LeaveRequestsTests : IClassFixture<TestDatabase>
{
    private readonly TestDatabase _database;

    public LeaveRequestsTests(TestDatabase database)
    {
        _database = database;
    }

    [Fact]
    public void Create_WithinQuota_Succeeds()
    {
        // Arrange
        using var db = _database.NewDb();
        var emp = new Employee { Name = "Test Emp", AnnualQuota = 20 };
        db.Employees.Add(emp);
        db.SaveChanges();

        var controller = new LeaveRequestsController(db);

        // Act: request 3 days, well within the quota.
        var result = controller.Create(new CreateLeaveRequestDto
        {
            EmployeeId = emp.Id,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 3, 1),
            EndDate = new DateTime(2026, 3, 3)
        });

        // Assert
        Assert.IsType<OkObjectResult>(result);
        Assert.Single(db.LeaveRequests);
    }

    [Fact]
    public void Create_WhenApprovedDaysAndNewRequestExceedQuota_ReturnsBadRequest()
    {
        // Arrange
        using var db = _database.NewDb();
        var emp = new Employee { Name = "Test Emp", AnnualQuota = 20 };
        db.Employees.Add(emp);
        db.SaveChanges();

        db.LeaveRequests.Add(new LeaveRequest
        {
            EmployeeId = emp.Id,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 1, 18),
            Days = 18,
            Status = LeaveStatus.Approved
        });
        db.SaveChanges();

        var controller = new LeaveRequestsController(db);

        // Act: 18 approved days + 3 requested days exceed the 20-day quota.
        var result = controller.Create(new CreateLeaveRequestDto
        {
            EmployeeId = emp.Id,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 3, 1),
            EndDate = new DateTime(2026, 3, 3)
        });

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Single(db.LeaveRequests);
    }

    [Fact]
    public void Approve_WhenRequestIsPending_ApprovesRequest()
    {
        // Arrange
        using var db = _database.NewDb();
        var emp = new Employee { Name = "Test Emp", AnnualQuota = 20 };
        var request = new LeaveRequest
        {
            Employee = emp,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 4, 1),
            EndDate = new DateTime(2026, 4, 3),
            Days = 3,
            Status = LeaveStatus.Pending
        };
        db.LeaveRequests.Add(request);
        db.SaveChanges();

        var controller = new LeaveRequestsController(db);

        // Act
        var result = controller.Approve(request.Id);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        var approved = Assert.IsType<LeaveRequest>(ok.Value);
        Assert.Equal(LeaveStatus.Approved, approved.Status);
    }

    [Fact]
    public void Approve_WhenRequestDoesNotExist_ReturnsNotFound()
    {
        using var db = _database.NewDb();
        var controller = new LeaveRequestsController(db);

        var result = controller.Approve(999);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Theory]
    [InlineData(LeaveStatus.Approved)]
    [InlineData(LeaveStatus.Rejected)]
    public void Approve_WhenRequestIsAlreadyProcessed_ReturnsConflict(LeaveStatus status)
    {
        // Arrange
        using var db = _database.NewDb();
        var emp = new Employee { Name = "Test Emp", AnnualQuota = 20 };
        var request = new LeaveRequest
        {
            Employee = emp,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 4, 1),
            EndDate = new DateTime(2026, 4, 3),
            Days = 3,
            Status = status
        };
        db.LeaveRequests.Add(request);
        db.SaveChanges();

        var controller = new LeaveRequestsController(db);

        // Act
        var result = controller.Approve(request.Id);

        // Assert
        Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(status, request.Status);
    }

    [Fact]
    public void Approve_WhenVacationBalanceIsInsufficient_ReturnsConflict()
    {
        // Arrange
        using var db = _database.NewDb();
        var emp = new Employee { Name = "Test Emp", AnnualQuota = 20 };
        db.Employees.Add(emp);
        db.SaveChanges();

        db.LeaveRequests.Add(new LeaveRequest
        {
            EmployeeId = emp.Id,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 1, 18),
            Days = 18,
            Status = LeaveStatus.Approved
        });

        var pending = new LeaveRequest
        {
            EmployeeId = emp.Id,
            Type = LeaveType.Vacation,
            StartDate = new DateTime(2026, 4, 1),
            EndDate = new DateTime(2026, 4, 3),
            Days = 3,
            Status = LeaveStatus.Pending
        };
        db.LeaveRequests.Add(pending);
        db.SaveChanges();

        var controller = new LeaveRequestsController(db);

        // Act
        var result = controller.Approve(pending.Id);

        // Assert
        Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(LeaveStatus.Pending, pending.Status);
    }

}
