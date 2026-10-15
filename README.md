API Monitoring System

A web-based API monitoring dashboard that helps you check whether public APIs are responding correctly, track response times, review failures, and optionally receive email alerts when scheduled checks fail.

Features
- Manual API checks: Run an HTTP GET check and view the response status, response time, and any network or timeout error.
- Scheduled monitoring: Automatically check saved monitors in the background using configurable intervals.
- Monitor management: Add, edit, pause, resume, and delete monitors.
- Expected status and latency rules: Configure the expected HTTP status code and a slow-response threshold for each monitor.
- Check history: Store timestamped results in MongoDB, including check source, status, response time, and error details.
- Dashboard statistics: View check totals, successful and failed checks, average response time, active monitors, and the scheduled-check success rate for the last 7 days.
- Incident tracking: Review recent failures and consecutive-failure information.
- Optional email alerts: Send an alert after consecutive scheduled failures when SMTP is configured.
- History filters and exports: Filter results by status, source, or URL, and export visible history to CSV.
- Timeout and URL validation: Handle slow or unreachable endpoints and validate public URLs before checking them.
Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB, Mongoose
- Scheduling: node-cron
- Email notifications: SMTP (optional)
Project Structure
API_Monitoring_System/
├── backend/       # Express server, monitoring logic, routes, and database models
├── frontend/      # Dashboard interface (HTML, CSS, JavaScript)
├── .gitignore
└── README.md
Requirements
- Node.js 18 or newer
- MongoDB running locally or a MongoDB connection string
- npm
  
How Monitoring Works
1. Add a public API URL as a monitor.
2. Set the expected HTTP status, slow-response threshold, and check interval.
3. Run a manual check or let the scheduler check the monitor automatically.
4. Review the result, response time, and saved history in the dashboard.
5. Investigate recent failures in the incidents section. Configure SMTP if you also want email alerts.
   
Important Notes
- Manual checks treat a 2xx response as healthy unless optional JSON response validation is enabled and fails.
- Scheduled checks compare the response with the monitor's configured expected status code (default 200) and apply the configured latency threshold.
- The scheduled-check success rate is based on recorded scheduled checks across monitors over the last 7 days. It is not a time-weighted SLA or an uptime guarantee for an individual monitor.
- Checks currently use HTTP GET; request bodies and custom API authentication headers are not configured by this project.
- URL validation blocks localhost and private-network destinations. Use public HTTP/HTTPS endpoints for monitoring.
- This is an educational project. Before production use, consider adding authentication and authorization, rate limiting, stronger SSRF/DNS-rebinding protections, and a persistent or distributed job scheduler for multi-instance deployments.
  
Future Improvements
- Authentication and role-based access
- More notification channels
- Advanced uptime reports and charts
- Stronger production monitoring and deployment options
  

