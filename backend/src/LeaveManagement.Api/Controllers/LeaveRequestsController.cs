using LeaveManagement.Api.Models;
using LeaveManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LeaveManagement.Api.Controllers;

[ApiController]
[Route("api/leave-requests")]
public class LeaveRequestsController : ControllerBase
{
    private readonly LeaveRequestService _service;

    public LeaveRequestsController(LeaveRequestService service)
    {
        _service = service;
    }

    // GET /api/leave-requests
    [HttpGet]
    public IActionResult GetAll()
    {
        return Ok(_service.GetAll());
    }

    // GET /api/leave-requests/search?name=Dana
    // Lets the UI quickly find requests by employee name.
    [HttpGet("search")]
    public IActionResult Search([FromQuery] string name)
    {
        return Ok(_service.Search(name));
    }

    // POST /api/leave-requests
    [HttpPost]
    public IActionResult Create([FromBody] CreateLeaveRequestDto dto)
    {
        var result = _service.Create(dto);

        return result.Status switch
        {
            LeaveRequestOperationStatus.Success => Ok(result.Request),
            LeaveRequestOperationStatus.EmployeeNotFound => NotFound("Employee not found"),
            LeaveRequestOperationStatus.InsufficientBalance =>
                BadRequest("Not enough vacation balance"),
            _ => Problem("Unexpected result while creating leave request")
        };
    }

    // POST /api/leave-requests/{id}/approve
    [HttpPost("{id:int}/approve")]
    public IActionResult Approve(int id)
    {
        var result = _service.Approve(id);

        return result.Status switch
        {
            LeaveRequestOperationStatus.Success => Ok(result.Request),
            LeaveRequestOperationStatus.EmployeeNotFound => NotFound("Employee not found"),
            LeaveRequestOperationStatus.RequestNotFound => NotFound("Leave request not found"),
            LeaveRequestOperationStatus.AlreadyProcessed =>
                Conflict("Only pending leave requests can be approved"),
            LeaveRequestOperationStatus.InsufficientBalance =>
                Conflict("Not enough vacation balance"),
            _ => Problem("Unexpected result while approving leave request")
        };
    }
}
