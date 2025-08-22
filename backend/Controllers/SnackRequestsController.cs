using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;
using System.Security.Claims;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SnackRequestsController : ControllerBase
    {
        private readonly SnackTrackerContext _context;

        public SnackRequestsController(SnackTrackerContext context)
        {
            _context = context;
        }

        // GET: api/SnackRequests
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SnackRequest>>> GetSnackRequests()
        {
            return await _context.SnackRequests.Include(sr => sr.RequestedByUser).ToListAsync();
        }

        // POST: api/SnackRequests
        [HttpPost]
        public async Task<ActionResult<SnackRequest>> PostSnackRequest([FromBody] SnackRequest snackRequest)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                return Unauthorized();
            }

            snackRequest.RequestedByUserId = int.Parse(userId);
            snackRequest.RequestDate = DateTime.UtcNow;
            snackRequest.Status = "Pending";

            _context.SnackRequests.Add(snackRequest);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSnackRequests), new { id = snackRequest.Id }, snackRequest);
        }

        // PUT: api/SnackRequests/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSnackRequest(int id, [FromBody] SnackRequest snackRequest)
        {
            if (id != snackRequest.Id)
            {
                return BadRequest();
            }

            _context.Entry(snackRequest).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SnackRequestExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/SnackRequests/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSnackRequest(int id)
        {
            var snackRequest = await _context.SnackRequests.FindAsync(id);
            if (snackRequest == null)
            {
                return NotFound();
            }

            _context.SnackRequests.Remove(snackRequest);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool SnackRequestExists(int id)
        {
            return _context.SnackRequests.Any(e => e.Id == id);
        }
    }
}
