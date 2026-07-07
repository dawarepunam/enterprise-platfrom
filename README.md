# Smart Enterprise Platform

Production-oriented scaffold for an AI-powered enterprise platform that combines project management, CRM, HRMS, quotations, collaboration, analytics and client portal workflows.

## Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js, MongoDB, Mongoose
- Auth: JWT + role-based access control
- Integrations: Cloudinary, Nodemailer, Socket.IO, Microsoft Graph, OneDrive, Microsoft Teams

## Structure
- `client/`: role-based frontend modules and shared components
- `server/`: Express app, routes, controllers, models, services and utilities

## Run
1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Start server with `npm run dev`

## Manager Module
- Manager dashboard: `/modules/manager/dashboard/dashboard.html`
- Manager projects: `/modules/manager/projects/projects.html`
- Project detail workspace: `/modules/manager/project-details/project-details.html?projectId=<id>`
- Manager team, tasks, files, meetings, mailbox, calendar, reports, profile, settings:
  - `/modules/manager/team-management/team-management.html`
  - `/modules/manager/tasks/tasks.html`
  - `/modules/manager/files/files.html`
  - `/modules/manager/meetings/meetings.html`
  - `/modules/manager/mailbox/mailbox.html`
  - `/modules/manager/calendar/calendar.html`
  - `/modules/manager/reports/reports.html`
  - `/modules/manager/profile/profile.html`
  - `/modules/manager/settings/settings.html`

### Manager APIs
- `GET /api/manager/dashboard`
- `GET /api/manager/projects`
- `GET /api/manager/projects/:id`
- `GET /api/manager/teams`
- `POST /api/manager/teams`
- `PUT /api/manager/teams/:id`
- `GET /api/manager/tasks`
- `POST /api/manager/tasks`
- `PUT /api/manager/tasks/:id`
- `DELETE /api/manager/tasks/:id`
- `GET /api/manager/files/:projectId`
- `GET /api/manager/meetings/:projectId`
- `GET /api/manager/reports/:projectId`

## Teams Collaboration Module
- Admin page: `/modules/admin/teams/teams.html`
- Sidebar shortcut: `/admin/teams.html`
- The CRM now provides a polished Microsoft Teams landing page instead of a custom in-app chat workspace.
- Admin flow:
  - Sign in to the CRM
  - Click `Teams` in the sidebar
  - Click `Open Microsoft Teams`
  - Use native Microsoft Teams features directly in the new tab
- OneDrive shortcut:
  - Click `Open OneDrive` to access Microsoft cloud storage directly

## Microsoft 365 Setup
1. Create or use a Microsoft 365 tenant with a mailbox that can create Teams meetings and OneDrive items.
2. Register an Azure App in Azure Portal.
3. Add application permissions for:
   - `User.Read.All`
   - `Files.ReadWrite.All`
   - `Sites.ReadWrite.All`
   - `Channel.Create`
   - `ChannelMessage.Send`
   - `Team.Create`
   - `TeamMember.ReadWrite.All`
   - `OnlineMeetings.ReadWrite`
   - `Calendars.ReadWrite`
4. Grant admin consent for the tenant.
5. Add delegated permissions for manager login:
   - `User.Read`
   - `Files.ReadWrite.All`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `Calendars.ReadWrite`
   - `Team.ReadBasic.All`
   - `ChannelMessage.Send`
   - `OnlineMeetings.ReadWrite`
   - `offline_access`
6. Set the redirect URI to `http://localhost:5000/api/microsoft/callback`.
7. Add the following variables in `server/.env`:
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_TENANT_ID`
   - `MICROSOFT_REDIRECT_URI`
   - `MICROSOFT_USER_EMAIL`
   - `ONEDRIVE_ROOT_FOLDER=CRM`
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT`
   - `FRONTEND_URL`

## Notes
- Sign in with a Microsoft 365 account before opening Teams or OneDrive from the CRM.
- The Teams page is a CRM launch surface for the actual Microsoft Teams web app, so native features like team creation, channels, chat, file sharing, audio/video calls, screen sharing, calendar, and notifications are handled by Microsoft.
- Optional project fields available in `Project`:
  - `projectTeamName`
  - `teamsWebUrl`
  - `oneDriveShareUrl`
  - `meetingLink`
