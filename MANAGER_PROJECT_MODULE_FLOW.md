# Manager Project Module Flow

## Goal

Keep the existing `MANAGER` workspace unchanged as the primary execution flow and add an enterprise-style project execution layer on top of it.

This merge keeps:

- `MANAGER` as the single delivery owner role
- current manager routes active
- current manager dashboard, projects, tasks, meetings, files, reports, and notifications intact

This add-on introduces:

- a visual flow gallery for the manager module
- module-wise click and redirect mapping
- a project-manager-style execution blueprint merged into the existing manager workspace

## Real Flow

```txt
Approved Requirement
  -> Manager Dashboard
  -> Assigned Projects
  -> Project Workspace
  -> Tasks / Kanban
  -> Sprint + Workload
  -> Meetings + Calendar
  -> Files + Client Updates
  -> Reports + Automation
  -> Delivery Completion
```

## Merge Principle

Do not replace the old manager flow.

Instead:

1. Keep existing manager pages as the working system.
2. Add project-execution detail as a visual reference layer.
3. Reuse existing manager routes wherever possible.
4. Treat "Project Manager" features as expanded capabilities of the current `MANAGER` role.

## Current Manager Routes Reused

- `/modules/manager/dashboard/dashboard.html`
- `/modules/manager/projects/projects.html`
- `/modules/manager/project-details/project-details.html`
- `/modules/manager/tasks/tasks.html`
- `/modules/manager/meetings/meetings.html`
- `/modules/manager/files/files.html`
- `/modules/manager/reports/reports.html`
- `/modules/manager/calendar/calendar.html`
- `/modules/manager/team/team.html`
- `/modules/manager/notifications/notifications.html`

## Added Visual Planning Route

- `/modules/manager/flow-gallery/flow-gallery.html`

## Module Boards Included

1. Dashboard Control Tower
2. Project Workspace
3. Tasks and Kanban
4. Sprint and Team Workload
5. Meetings and Calendar
6. Files and Client Updates
7. Reports and Automation

## What Each Board Shows

- first visible UI
- important cards and widgets
- where click goes
- what modal opens
- what page redirects
- how the manager moves through the module

## Practical Use

Use this flow gallery when:

- explaining the manager module to stakeholders
- sharing UI direction with designers
- showing developers what to build next
- merging product-manager-style requirements into the existing manager workspace without breaking old screens
