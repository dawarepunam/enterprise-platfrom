# Enterprise CRM Marketing Module Flow

## 1. Goal

This module should work like a proper CRM growth engine, not a static dashboard.
Marketing should be able to plan campaigns, target audience segments, launch creatives, capture leads, qualify them, hand them to sales, and track revenue impact from one connected system.

Core expectations:

- One shared login form for all roles
- Role-based redirect after login
- Every sidebar item opens a real page
- Cards should redirect to detail pages
- All forms should save data in MongoDB through Express APIs
- Marketing, leads, and sales should stay connected
- Microsoft integrations should support outreach, meetings, reminders, and collaboration
- UI should stay responsive on mobile, tablet, and desktop

## 2. Role Flow

### Admin

Admin controls the whole business structure.

Admin should be able to:

- Create `MARKETING` users
- Create `SALES` users
- Optionally create a separate `LEADS` desk user later
- Assign permissions
- Connect Microsoft / SMTP / API keys
- Monitor campaign performance and revenue summary

### Marketing User

Marketing handles:

- Campaign planning
- Audience segmentation
- Template design
- Landing pages and forms
- Automation setup
- Lead generation
- Top-level analytics
- Handover to sales

### Sales User

Sales handles:

- Qualified leads received from marketing
- Calls, meetings, follow-ups
- Quotations and proposals
- Deal conversion
- Revenue updates

### Leads Desk

If you want a separate `LEADS` role later, keep it between marketing and sales.

Leads desk handles:

- First contact
- Qualification
- Status updates
- Follow-up reminders
- Sales assignment

Current project note:
Right now the codebase already supports `MARKETING` and `SALES` strongly. A separate `LEADS` role can be added next as an extension.

## 3. Login Flow

### Shared Login UI

Fields:

- Email
- Password
- Role dropdown

Recommended roles in dropdown:

- Admin
- Manager
- Member
- HR
- Marketing
- Sales

Future-ready role:

- Leads

### Login Process

1. User opens `/login.html`
2. User selects role
3. User enters email and password
4. Backend validates credentials
5. JWT token is generated
6. Token and user data are stored in local storage
7. User is redirected by role

### Redirect Map

- `ADMIN` -> `/modules/admin/dashboard/dashboard.html`
- `MANAGER` -> `/modules/manager/dashboard/dashboard.html`
- `MEMBER` -> `/modules/member/dashboard/dashboard.html`
- `HR` -> `/hr/dashboard.html`
- `MARKETING` -> `/marketing/dashboard.html`
- `SALES` -> `/sales/dashboard.html`

Future:

- `LEADS` -> `/leads/index.html`

## 4. Marketing Sidebar

This is the ideal marketing sidebar flow for your CRM:

1. Dashboard
2. Campaigns
3. Audience
4. Templates
5. Automation
6. Landing Pages
7. Forms
8. Leads
9. Analytics
10. Reports
11. Social Media
12. Calendar
13. Notifications
14. Settings

Sidebar behavior:

- Desktop: fixed glass sidebar on left
- Tablet: collapsible sidebar
- Mobile: hamburger open / close
- Active page: neon highlight + glow border
- Hover state: icon glow + label hint

## 5. Marketing Dashboard Page

Route:

- `/marketing/dashboard.html`

### What user should see first

Top area:

- Welcome message with user name
- Date range filter
- Search box
- Quick create button
- Notification shortcut
- Teams shortcut
- Outlook shortcut

### Top KPI Cards

1. Running Campaigns
2. Generated Leads
3. Ad Spend
4. ROI
5. CTR
6. Conversions
7. Revenue Generated
8. Cost Per Lead

### Card Interaction

On hover:

- Card should lift slightly
- Border glow should appear
- Secondary hint text becomes more visible
- Mini trend / performance hint should feel active

On click:

- Running Campaigns -> `/marketing/campaigns.html`
- Generated Leads -> `/leads/index.html`
- Ad Spend -> `/marketing/analytics.html`
- ROI -> `/marketing/analytics.html`
- CTR -> `/marketing/analytics.html`
- Conversions -> `/leads/index.html`
- Revenue Generated -> `/sales/dashboard.html`
- Cost Per Lead -> `/marketing/analytics.html`

### Charts Section

Recommended charts:

- Campaign performance line chart
- Lead source donut chart
- Conversion funnel chart
- Revenue trend chart

### Secondary Panels

- Recent Activity
- Quick Actions
- Upcoming Tasks
- Notifications

### Quick Actions Redirects

- Create Campaign -> `/marketing/campaign-create.html`
- Create Email Template -> `/marketing/templates.html`
- Add New Audience -> `/marketing/audience.html`
- Create Automation -> `/marketing/automation.html`

## 6. Campaigns Page

Route:

- `/marketing/campaigns.html`

### Page Purpose

This is the operational control room for all campaigns.

### Page Sections

- Search bar
- Status filter
- Campaign table
- Campaign card grid
- New campaign button

### Campaign Table Columns

- Campaign Name
- Status
- Audience
- Leads
- Revenue
- Actions

### Table Actions

- View
- Edit
- Duplicate
- Analytics
- Delete

### Row Click Redirect

- `/marketing/campaign-details.html?id=:id`

### Card Hover

On hover show:

- CTR
- Reach
- Revenue
- Next step

### Next Step Logic

- Planning -> open preview flow
- Active -> open leads pipeline
- Completed -> open analytics/report

## 7. Create Campaign Flow

Route:

- `/marketing/campaign-create.html`

### Step 1: Basic Details

User enters:

- Campaign Name
- Campaign Type
- Channel
- Budget
- Start Date
- End Date
- Expected Revenue
- Status
- Objective
- CTA Label
- CTA URL
- Hero Asset
- Notes

Behavior:

- Save as browser draft
- Do not create DB record yet
- Show validation inline
- Next button redirects to audience page

Redirect:

- `/marketing/audience.html`

## 8. Audience Page

Route:

- `/marketing/audience.html`

### Purpose

Marketing should choose saved segments or define live targeting rules.

### Filters

- City
- Industry
- Job Role
- Company Size
- Lead Score Band
- Previous Activity
- Source

### Cards

Each audience card should show:

- Segment name
- Segment size
- Buying intent
- Main filters

On hover:

- Show estimated reach
- Show expected lead quality
- Show last campaign performance

On click:

- Save selected audience into campaign draft
- Redirect to templates page

Redirect:

- `/marketing/templates.html`

## 9. Templates Page

Route:

- `/marketing/templates.html`

### Layout

Left panel:

- Components list

Center:

- Live canvas preview

Right panel:

- Design controls

### Components

- Header
- Text
- Button
- Image
- Banner
- Video
- Divider
- Footer
- Social Icons

### Actions

- Choose template preset
- Edit CTA
- Change block order
- Adjust colors
- Set typography

On click next:

- Redirect to preview page

Redirect:

- `/marketing/preview.html`

## 10. Preview & Publish Page

Route:

- `/marketing/preview.html`

### Preview Modes

- Desktop
- Tablet
- Mobile

### Controls

- Schedule date
- Schedule time
- Timezone
- Test email
- Publish button

### Publish Backend Flow

1. Draft payload is transformed into a campaign payload
2. Express API creates or updates campaign in MongoDB
3. Campaign metrics are initialized
4. Workflow notification is dispatched
5. Outlook / SMTP send path can be used
6. Teams notification can be triggered
7. Campaign becomes visible in campaigns page

After publish redirect:

- `/marketing/campaigns.html`

## 11. Campaign Details Page

Route:

- `/marketing/campaign-details.html?id=:id`

### Page Tabs / Panels

- Overview
- Analytics
- Leads Generated
- Audience
- Performance
- Revenue
- Timeline
- Files
- Meetings

### What user sees

Overview cards:

- Generated Leads
- Converted Leads
- Budget
- Spend

Analytics:

- Impressions
- Clicks
- CTR
- Revenue
- Conversion

### Click Behavior

- Lead in generated leads list -> open lead detail page
- Meeting item -> open sales / collaboration context
- Files -> preview or download

## 12. Leads Workspace

Route:

- `/leads/index.html`

### Main Layout

- Pipeline summary cards
- Kanban board
- Lead list
- Source chart
- Filters
- Search

### Pipeline Stages

- New
- Contacted
- Interested
- Proposal Sent
- Negotiation
- Converted
- Lost

If you want more detailed business stages later:

- New
- Contacted
- Connected
- Interested
- Qualified
- Proposal Sent
- Converted
- Lost

### Lead Card Interaction

On hover:

- Show score
- Show source
- Show assigned owner
- Show quick action hints

Quick actions:

- Call
- WhatsApp
- Email
- Assign Sales
- Schedule Meeting

On click:

- `/leads/lead-details.html?id=:id`

## 13. Lead Detail Page

Route:

- `/leads/lead-details.html?id=:id`

### Sections

- Lead Profile
- Overview
- Timeline
- Meetings
- Calls
- Emails
- Notes
- Proposal
- Documents
- History

### Key Actions

- Update status
- Add note
- Log call
- Create follow-up
- Assign sales
- Schedule meeting

### Sales Handover Flow

1. Lead becomes qualified
2. Sales owner is assigned
3. Lead status becomes sales-ready
4. Notification is sent
5. Deal record is created or synced
6. Sales dashboard reflects the new opportunity

## 14. Sales Connection

Route:

- `/sales/dashboard.html`

Marketing-to-sales handoff should pass:

- Lead name
- Contact info
- Company
- Source campaign
- Lead score
- Quality
- Notes
- Follow-up context
- Expected value

Sales should then continue with:

- Call logs
- Meetings
- Proposal
- Negotiation
- Payment
- Closure

## 15. Analytics Page

Route:

- `/marketing/analytics.html`

### Metrics

- ROI
- Cost per lead
- Conversion rate
- Channel performance
- Campaign performance
- Audience engagement
- Revenue contribution

### Charts

- Line chart
- Bar chart
- Donut chart
- Funnel chart
- Area chart

### Click Paths

- Campaign in chart -> campaign details
- Lead source slice -> leads page with filter
- Revenue segment -> sales dashboard / report

## 16. Reports Page

Route:

- `/marketing/reports.html`

### Report Types

- Campaign Report
- Lead Report
- Revenue Report
- Team Performance Report
- Monthly Executive Summary

### Export Options

- PDF
- Excel
- CSV

## 17. Social Media Page

Route:

- `/marketing/social-media.html`

### Use Cases

- Instagram publishing
- Facebook publishing
- LinkedIn publishing
- Engagement tracking
- Content calendar

### Card Types

- Scheduled posts
- Platform health
- Engagement summary
- Best post timing

### Click Flow

- Create post -> post composer
- Platform card -> engagement detail
- Scheduled item -> edit schedule

## 18. Calendar Page

Route:

- `/marketing/calendar.html`

### Should show

- Campaign publish dates
- Team meetings
- Demo calls
- Reminder tasks
- Approval deadlines

### Integrations

- Microsoft Calendar
- Outlook invites
- Teams meeting links

## 19. Notifications Page

Route:

- `/marketing/notifications.html`

### Notifications should include

- New lead generated
- Campaign completed
- Approval requested
- Sales handover done
- Meeting scheduled
- Email send issue
- Automation failed

### Actions

- Mark as read
- Open linked record
- Filter by type

## 20. Settings Page

Route:

- `/marketing/settings.html`

### Sections

- SMTP
- Outlook integration
- Microsoft Teams
- Calendar sync
- API keys
- Roles and permissions
- Workflow rules
- Theme settings

## 21. Microsoft Integrations

### Outlook

Use for:

- Test email
- Campaign delivery
- Lead follow-up mail
- Proposal mail

### Microsoft Teams

Use for:

- Launch alerts
- Lead handover alerts
- Team discussion threads
- Internal approval flow

### Microsoft Calendar

Use for:

- Demo scheduling
- Follow-up reminders
- Sales meetings
- Campaign launch slots

### Suggested Live Flow

1. Marketing schedules campaign
2. System posts alert to Teams
3. Qualified lead is generated
4. Sales meeting is booked
5. Teams link is created
6. Outlook invite is sent
7. Reminder is triggered before meeting

## 22. Database Collections

Recommended core collections:

- `users`
- `campaigns`
- `leads`
- `salesdeals`
- `notifications`
- `meetings`
- `followups`
- `calllogs`
- `quotations`
- `files`
- `reports`

Next-phase collections:

- `audiences`
- `templates`
- `automationflows`
- `landingpages`
- `formsubmissions`
- `socialposts`

## 23. Backend Flow

### Suggested folder structure

- `routes/`
- `controllers/`
- `models/`
- `middleware/`
- `services/`
- `utils/`
- `config/`

### Marketing API flow

1. Frontend page collects input
2. JS builds payload
3. API call hits Express route
4. Controller validates and normalizes payload
5. MongoDB record is created / updated
6. Workflow service creates notifications
7. Realtime socket event refreshes dashboard

## 24. UI / UX Rules

### Visual style

- Dark theme
- Glass panels
- Soft neon highlights
- Rounded large cards
- Clear spacing
- Big readable typography

### Hover behavior

- Cards lift up
- Glows intensify
- CTA becomes visible
- Hidden quick stats slide in

### Mobile behavior

- Sidebar becomes drawer
- Tables become horizontal scroll blocks
- Cards stack in one column
- Charts use shorter height
- Primary actions stay thumb-friendly

## 25. Final End-to-End Business Flow

1. Admin creates marketing user
2. Marketing logs in from shared login page
3. Dashboard opens
4. Marketing clicks `Create Campaign`
5. Step 1 saves basic details
6. Audience page selects segment
7. Templates page finalizes creative
8. Preview page schedules and publishes
9. Campaign appears in campaign library
10. Leads start coming into leads workspace
11. Marketing or leads desk qualifies the lead
12. Lead is assigned to sales
13. Sales follows up and sends proposal
14. Deal is converted
15. Revenue reflects in analytics and reports

## 26. Recommended Next Additions

After the current module is stable, add:

- Separate `LEADS` role
- Automation builder with saved workflows
- Landing page builder
- Form builder with UTM tracking
- WhatsApp integration
- Social post scheduler
- Approval workflow for campaign publishing
- AI subject line / copy suggestions
- Advanced attribution model

