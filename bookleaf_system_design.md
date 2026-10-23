# BookLeaf Author Support & Communication Portal

## System Design and Implementation Brief for the Coding Agent

**Purpose:** Build the assignment as a working, documented full-stack
application. Use this document as the implementation plan and source of
truth for architecture decisions. Follow the phases in order; do not try
to build every feature at once.

------------------------------------------------------------------------

## 1. Project Goal

Build an Author Support & Communication Portal for BookLeaf Publishing
with two interfaces:

1.  **Author portal**
    -   Email/password login.
    -   View books and royalty summaries belonging to the logged-in
        author.
    -   Create support tickets for a specific book or a general/account
        issue.
    -   View ticket status and public admin responses.
    -   See updates without manually refreshing the page.
2.  **Admin portal**
    -   View tickets across all authors.
    -   Filter and sort by status, category, priority, and date.
    -   Assign tickets, update status, and add internal notes.
    -   Send responses visible to authors.
    -   Later, review AI-suggested category, priority, and response
        drafts.

The application must work without the AI service. Ticket creation, book
viewing, and manual ticket handling must not depend on an LLM being
available.

## 2. Final Technology Decisions

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Frontend                React.js                Author and admin
                                                  interfaces

  Main API                Node.js + Express       REST API,
                                                  authentication,
                                                  authorization,
                                                  validation, business
                                                  logic

  Database                PostgreSQL              Users, books, tickets,
                                                  responses, and
                                                  audit/job data

  Queue                   AWS SQS Standard        Asynchronous background
                                                  jobs

  Worker                  Python                  Consume SQS jobs and
                                                  perform AI processing
                                                  in a later phase

  AI provider             External LLM API        Classification,
                          (choose one suitable    priority suggestions,
                          provider)               response drafts

  API documentation       OpenAPI/Swagger or      Explain and test the
                          clear README endpoint   REST API
                          documentation           

  Updates                 Polling first; consider Refresh ticket data and
                          SSE/WebSockets only if  AI status without a
                          justified               manual page refresh
  -----------------------------------------------------------------------

### Important scope decision

Use **AWS SQS**, not RabbitMQ. Use **PostgreSQL**, not MongoDB. Do not
add a vector database initially. The provided knowledge base is small
and fixed, so relevant policy text can be included in the AI prompt.
Consider `pgvector` only if a larger knowledge base later makes semantic
retrieval necessary.

Do not add unnecessary infrastructure or libraries just to make the
architecture look more complex.

------------------------------------------------------------------------

## 3. High-Level Architecture

``` text
                           ┌──────────────────────────┐
                           │       React UI           │
                           │ Author Portal / Admin UI │
                           └────────────┬─────────────┘
                                        │ HTTPS / REST
                           ┌────────────▼─────────────┐
                           │ Node.js + Express API    │
                           │ Routes / Middleware      │
                           │ Controllers / Services   │
                           └───────┬───────────┬──────┘
                                   │           │
                           Read/write DB       │ Send background job
                                   │           │
                         ┌─────────▼───┐   ┌───▼──────────────┐
                         │ PostgreSQL  │   │ AWS SQS Standard │
                         └─────────────┘   └────────┬────────┘
                                                   │ Receive job
                                          ┌────────▼─────────┐
                                          │ Python Worker    │
                                          │ Later AI phase   │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │ External LLM API │
                                          └──────────────────┘
```

### Main request flow: create a ticket

1.  Author submits a ticket from React.
2.  Express authentication middleware verifies the session/token.
3.  Validation checks required fields and input types.
4.  Authorization/business logic verifies the selected book belongs to
    the logged-in author. A general/account-level ticket may have no
    book.
5.  API stores the ticket in PostgreSQL with status `Open`.
6.  Return the created ticket to the frontend.
7.  In the later AI phase, enqueue a classification job in SQS after the
    ticket is saved. If queue publishing fails, the ticket remains
    created and usable; record/log the failure and provide a
    retry/reconciliation strategy.
8.  Python worker processes the message, calls the LLM, validates the
    output, and stores AI suggestions.
9.  The UI polls for ticket updates or AI processing status.
10. An admin reviews the ticket and controls all final changes and any
    response sent to the author.

### Main request flow: admin responds

1.  Admin opens a ticket.
2.  API verifies the user has the admin role.
3.  Admin updates status/assignment/category/priority, adds an internal
    note, or sends a public response.
4.  Save the change in PostgreSQL.
5.  Public responses appear in the author's ticket conversation.
    Internal notes must never be exposed to author endpoints.
6.  The frontend refreshes the ticket data through polling.

### Reliability rules

-   Save the ticket before attempting AI processing.
-   Set timeouts on external calls.
-   SQS Standard can deliver a message more than once; worker processing
    must be idempotent.
-   Configure a dead-letter queue (DLQ) and sensible redrive policy for
    repeatedly failing jobs.
-   Limit retries; do not retry permanent validation errors forever.
-   Record processing state and error details without exposing secrets
    or sensitive provider responses to users.
-   Never overwrite an admin's manually selected category or priority
    with a late AI result. Track whether fields were manually overridden
    or only AI-suggested.
-   Keep AI failures separate from the ticket's business status. A
    ticket should still be manually manageable if AI fails.
-   Do not send the entire ticket history and entire knowledge base to
    every model call when a smaller relevant context is sufficient.

------------------------------------------------------------------------

## 4. Suggested Repository Structure

Keep the repository straightforward and use separate folders for the
frontend, API, and worker.

``` text
bookleaf-support-portal/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── books/
│   │   │   ├── author-tickets/
│   │   │   └── admin-tickets/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── App.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── migrations/
│   ├── seeds/
│   ├── tests/
│   └── package.json
├── ai-worker/
│   ├── app/
│   │   ├── config.py
│   │   ├── sqs_consumer.py
│   │   ├── handlers/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt or pyproject.toml
├── docs/
│   ├── architecture.md
│   └── api.md
├── .env.example
├── .gitignore
└── README.md
```

Create only the folders/files needed for the current phase. Keep HTTP
handling, business logic, persistence, and background job handling
separate. Avoid giant controller files and avoid premature abstractions.

------------------------------------------------------------------------

## 5. Database Design

First inspect the supplied `bookleaf_sample_data.json` and the
assignment PDF. Use the actual JSON structure and preserve the exact
supplied author/book records. Do not invent a replacement dataset or
assume property names before inspection.

### Core tables

#### `users`

Suggested fields: - `id` --- primary key - `name` - `email` --- unique,
normalized - `password_hash` - `role` --- `author` or `admin` -
`created_at`, `updated_at`

The supplied sample dataset may not include passwords. Create documented
demo credentials or a deterministic development-only seed strategy.
Never store plaintext passwords. Make clear that demo credentials are
for evaluation only.

#### `books`

Suggested fields, adjusted to match the sample JSON: - `id` --- primary
key - `author_id` --- foreign key to `users` - `title` - `isbn` -
`genre` - `publication_date` - `status` - `mrp` --- `NUMERIC`, not
floating point - `copies_sold` - `royalty_earned` --- `NUMERIC` -
`royalty_paid` --- `NUMERIC` - `royalty_pending` --- `NUMERIC` -
timestamps as appropriate

The assignment asks for these book/royalty summaries. If the sample data
stores the summaries directly, storing them on `books` is acceptable for
this assignment. Do not invent a detailed sales ledger unless the source
data or implementation requires it.

#### `tickets`

Suggested fields: - `id` --- primary key - `author_id` --- foreign key
to `users` - `book_id` --- nullable foreign key to `books` for
general/account-level tickets - `subject` - `description` - `status` ---
`Open`, `In Progress`, `Resolved`, `Closed` - `category` --- one of the
assignment categories; allow a pending/unclassified state if needed -
`priority` --- `Critical`, `High`, `Medium`, `Low`; allow pending state
before AI processing if needed - `assigned_admin_id` --- nullable
foreign key to `users` - `category_source` / `priority_source` or
equivalent override tracking, if useful - `created_at`, `updated_at`

#### `ticket_responses`

Suggested fields: - `id` --- primary key - `ticket_id` --- foreign key
to `tickets` - `author_id` or `created_by` --- foreign key to `users` -
`message` - `is_internal` --- boolean - `created_at`

Use one response/note model if clear and properly filtered, or separate
public responses from internal notes if that is simpler to secure. Never
expose internal notes to authors.

#### Optional `ticket_activity`

Use this if time allows: - `id` - `ticket_id` - `actor_id` - `action` -
`metadata` (JSONB only if appropriate) - `created_at`

#### Later AI processing fields/table

When implementing SQS and the worker, store enough information to track
jobs, for example: - `ticket_id` - `job_type` - `status` (`pending`,
`processing`, `completed`, `failed`) - `attempt_count` - `last_error`
(sanitized) - timestamps

This can be a dedicated `ai_jobs` table or an appropriately designed set
of ticket fields. Choose one clear approach; avoid duplicating state in
multiple places without a reason.

### Database implementation requirements

-   Use migrations or a repeatable schema setup, not manual undocumented
    edits.
-   Use foreign keys, unique constraints, appropriate indexes, and
    transactions where needed.
-   Add indexes for common ticket filters, timestamps, foreign keys, and
    normalized email.
-   Use `NUMERIC`/decimal for currency.
-   Make the seed script repeatable/idempotent; re-running it should not
    create duplicate sample records.
-   Do not delete or overwrite production data from a seed script.
-   Use the provided data as the test baseline.

------------------------------------------------------------------------

## 6. Backend REST API

Use consistent JSON responses and meaningful HTTP status codes. Validate
request bodies and query parameters. Document every endpoint.

### Authentication

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  `POST`                  `/api/auth/login`       Authenticate with
                                                  email/password

  `GET`                   `/api/auth/me`          Return the
                                                  authenticated user's
                                                  basic profile and role

  `POST`                  `/api/auth/logout`      Include if the chosen
                                                  auth strategy needs
                                                  server-side
                                                  logout/revocation
  -----------------------------------------------------------------------

Choose a sensible authentication strategy (for example, short-lived
JWTs). Do not put secrets in source code. If using browser cookies,
configure secure, HttpOnly, SameSite cookies and CSRF protection as
appropriate. If using bearer tokens, avoid unsafe long-term token
storage in browser local storage where possible. Explain the selected
approach in the README.

### Author book APIs

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  `GET`                   `/api/books`            List books belonging to
                                                  the authenticated
                                                  author

  `GET`                   `/api/books/:id`        Return a book only if
                                                  the author owns it;
                                                  admins may have broader
                                                  access if needed
  -----------------------------------------------------------------------

### Author ticket APIs

  -----------------------------------------------------------------------
  Method                  Endpoint                Purpose
  ----------------------- ----------------------- -----------------------
  `POST`                  `/api/tickets`          Create a ticket for an
                                                  owned book or a
                                                  general/account issue

  `GET`                   `/api/tickets`          List only the
                                                  authenticated author's
                                                  tickets

  `GET`                   `/api/tickets/:id`      Return a ticket and
                                                  public responses only
                                                  if the author owns it;
                                                  admin access follows
                                                  role policy
  -----------------------------------------------------------------------

Ticket creation request example:

``` json
{
  "bookId": "optional-book-id-or-null",
  "subject": "ISBN mismatch on a listing",
  "description": "The ISBN shown on the retailer listing differs from my book."
}
```

Adapt ID type and property naming to the actual schema. Do not accept an
arbitrary `authorId` from the request body; derive it from the
authenticated user.

### Admin APIs

  ------------------------------------------------------------------------------------
  Method                  Endpoint                             Purpose
  ----------------------- ------------------------------------ -----------------------
  `GET`                   `/api/admin/tickets`                 List all tickets with
                                                               filters, sorting, and
                                                               pagination

  `GET`                   `/api/admin/tickets/:id`             Return complete
                                                               admin-visible ticket
                                                               details, including
                                                               internal notes

  `PATCH`                 `/api/admin/tickets/:id`             Update status,
                                                               category, priority,
                                                               and/or assignment

  `POST`                  `/api/admin/tickets/:id/responses`   Add a public response
                                                               or internal note
  ------------------------------------------------------------------------------------

Suggested list query parameters: - `status` - `category` - `priority` -
`from` - `to` - `page` - `limit` - `sort` / `order`

Validate allowed values and enforce a reasonable maximum `limit`. Prefer
deterministic sorting, such as priority rank followed by oldest
unresolved ticket, with explicit handling for missing values.

Admin update examples should allow only permitted fields. Do not let
authors access admin endpoints or change their role by submitting
request data.

### Later AI/job APIs

Add only when AI phase starts: - `GET /api/tickets/:id/ai-status` or
include safe processing status in ticket detail. - An admin-triggered
draft-generation action if appropriate. - A retry endpoint for failed AI
jobs only if it is needed and protected.

Do not expose SQS directly to the frontend.

### API quality

-   Use middleware for authentication, role authorization, request
    validation, not-found handling, and centralized error handling.
-   Keep controllers thin; put business rules in services.
-   Use parameterized database queries or a well-maintained ORM/query
    builder.
-   Never trust client-supplied role or ownership values.
-   Use consistent error shapes,
    e.g. `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`.
-   Avoid leaking stack traces, SQL details, tokens, provider secrets,
    or internal notes.
-   Provide Swagger/OpenAPI or clear endpoint docs with sample requests
    and responses.

------------------------------------------------------------------------

## 7. Ticket Categories and Priority

Use these exact categories from the assignment:

1.  `Royalty & Payments`
2.  `ISBN & Metadata Issues`
3.  `Printing & Quality`
4.  `Distribution & Availability`
5.  `Book Status & Production Updates`
6.  `General Inquiry`

Priority values: - `Critical` - `High` - `Medium` - `Low`

In the initial backend, these can be set manually/defaulted as
appropriate. In the AI phase, the model can suggest values. Admins must
be able to override suggestions, and later worker results must not
overwrite those manual overrides.

Ticket business statuses: - `Open` - `In Progress` - `Resolved` -
`Closed`

Keep business status separate from AI processing status.

------------------------------------------------------------------------

## 8. Frontend Implementation Plan

Build the frontend only after the core backend endpoints have been
tested. Use React and a consistent API client layer. Keep API calls out
of large presentation components.

### Shared pages/components

-   Login page
-   Role-aware route protection
-   Shared layout/navigation
-   Loading, empty, error, and retry states
-   Reusable status/category/priority labels
-   Form validation and clear success/error feedback

### Author portal

1.  **Dashboard / My Books**
    -   Title, ISBN, genre, publication date, status, MRP, copies sold,
        royalty earned, royalty paid, royalty pending.
2.  **Create Support Ticket**
    -   Book dropdown plus `General / Account Level`.
    -   Subject and description.
    -   Optional attachment UI is acceptable; actual upload is a bonus
        and must not be falsely presented as functional if not
        implemented.
3.  **My Tickets**
    -   List ticket subject, status, category/priority if available,
        creation/update dates.
4.  **Ticket Detail**
    -   Original query and public responses.
    -   Never show internal notes.
    -   Poll periodically for changes or use another justified real-time
        mechanism.

### Admin portal

1.  **Ticket Queue**
    -   All authors' tickets.
    -   Filters for status, category, priority, and date.
    -   Pagination and useful sorting.
    -   Make urgent and oldest unresolved tickets easy to identify.
2.  **Ticket Detail**
    -   Author and associated book details.
    -   Status/category/priority controls.
    -   Assignment control.
    -   Conversation.
    -   Internal notes separated visually from public replies.
3.  **AI panel --- later**
    -   AI category and priority suggestions.
    -   Editable response draft.
    -   Clear distinction between suggestion and sent message.
    -   Admin explicitly reviews and sends the public response.

Use responsive layouts and accessible labels. Do not spend too long on
decorative polish before all required flows work.

------------------------------------------------------------------------

## 9. AI Phase (After Core Backend and Frontend Work)

The Python worker and SQS integration are a later phase, not a
prerequisite for the first backend milestone.

### Job types

-   `CLASSIFY_TICKET`: propose category and priority for a newly created
    ticket.
-   `GENERATE_RESPONSE_DRAFT`: generate an editable response for an
    admin when requested.

Use a versioned message schema, for example:

``` json
{
  "jobId": "unique-job-id",
  "jobType": "CLASSIFY_TICKET",
  "ticketId": "ticket-id",
  "schemaVersion": 1,
  "createdAt": "ISO-8601 timestamp"
}
```

The message should contain only the identifiers and minimal metadata
needed. The worker can load authoritative ticket data from PostgreSQL
using the agreed data-access approach. Do not put credentials or
unnecessary personal information into SQS messages.

### Worker architecture

1.  Poll/receive a message from SQS using AWS SDK/Boto3.
2.  Validate the message schema and job type.
3.  Mark the job as processing.
4.  Load the ticket and relevant data using a clearly defined strategy:
    -   either a shared, documented PostgreSQL access layer with
        controlled permissions, or
    -   a private internal API. Choose one and document why; avoid
        inconsistent dual writes.
5.  Build a bounded prompt with the ticket text and only relevant
    BookLeaf policy/knowledge-base sections.
6.  Call the LLM with a timeout and appropriate retry policy.
7.  Parse and validate structured output; reject unknown
    category/priority values.
8.  Save suggestions and job state without overriding manual admin
    decisions.
9.  Acknowledge/delete the SQS message only after successful processing
    and durable state update.
10. On repeated failures, allow SQS redrive to the configured DLQ and
    log sanitized diagnostics.

Use least-privilege AWS IAM permissions. Keep AWS credentials and the
LLM key in environment/secret configuration; never commit them or expose
them to React. Local development may use an AWS profile rather than
hard-coded credentials.

### AI response drafting

-   Draft only; never auto-send a response.
-   Ground the draft in the BookLeaf knowledge base and actual
    ticket/book information.
-   Be empathetic and professional, acknowledge the concern, give
    specific next steps and realistic timelines, and own BookLeaf
    mistakes when appropriate.
-   Avoid making up payout dates, book statuses, investigations, or
    promises. If data is missing, ask the admin to verify it.
-   Admin can edit, discard, regenerate, and send the final response.
-   If the LLM is unavailable, admins must still be able to write and
    send manual responses.

### Knowledge base facts supplied by the assignment

Use the assignment PDF as the authoritative source for the full
knowledge base. Important examples include: - Royalties are calculated
on net profit (MRP minus printing, platform commission, and shipping),
with an 80/20 split described in the assignment. - Royalties are
calculated quarterly and paid within 45 days after quarter end; minimum
payout threshold is ₹1,000. - A mismatch involving a BookLeaf ISBN is a
high-priority issue and should be escalated. - Standard print turnaround
is 5--7 business days; verified quality issues can receive a free
reprint. - New distribution listings typically take 7--10 business days;
stock resync may take 24--48 hours. - Metadata changes may take 3--5
business days to appear on platforms. - Keep all response tone and
policy details aligned with the supplied assignment rather than
inventing new company policies.

### Cost and failure handling

-   Use a cost-appropriate model for classification and drafting.
-   Keep prompts small and send only relevant context.
-   Set timeouts and bounded retries.
-   Handle rate limits and provider outages gracefully.
-   Track model/job status and sanitized errors.
-   Never make ticket creation depend on successful AI output.

### No vector database initially

Do not implement embeddings, RAG infrastructure, or a vector database
unless needed after the baseline works. The assignment's small static
knowledge base can be selected and included directly in the prompt. A
retrieval solution can be a future enhancement.

------------------------------------------------------------------------

## 10. Environment Variables and Secrets

Provide `.env.example` files with placeholder values only. Never commit
real secrets.

Potential backend configuration: - `PORT` - `DATABASE_URL` -
`JWT_SECRET` or the chosen auth configuration - `FRONTEND_ORIGIN` -
`AWS_REGION` (when SQS is added) - `SQS_QUEUE_URL` (when SQS is added)

Potential worker configuration: - `AWS_REGION` - `SQS_QUEUE_URL` -
`SQS_DLQ_URL` only if the worker explicitly needs it - `DATABASE_URL` if
using direct database access - `LLM_API_KEY` - `LLM_MODEL`

Use the provider's official environment variable conventions where
applicable. Use IAM roles in deployed AWS environments rather than
long-lived hard-coded AWS keys. Do not expose secrets through Vite/React
environment variables; frontend variables are not secret.

------------------------------------------------------------------------

## 11. Testing Plan

### Backend tests

-   Login success and invalid credentials.
-   Protected routes reject unauthenticated requests.
-   Author cannot read another author's book or ticket.
-   Author cannot submit a ticket for another author's book.
-   Author can submit a general/account-level ticket.
-   Ticket validation rejects missing subject/description and invalid
    book IDs.
-   Admin can list and filter all tickets.
-   Author cannot call admin APIs.
-   Admin can update status and assignment.
-   Public responses are visible to the ticket's author.
-   Internal notes are never included in author responses.
-   Pagination/filter combinations behave correctly.
-   Database errors produce safe, consistent responses.

### SQS/worker tests (later)

-   Valid job is processed successfully.
-   Malformed or unknown job is handled safely.
-   Duplicate delivery does not duplicate side effects.
-   LLM timeout/rate limit does not break ticket management.
-   Failed jobs retry within bounds and eventually go to the DLQ.
-   AI result does not overwrite a manual override.
-   A manual response remains possible when AI is unavailable.

### End-to-end acceptance tests

1.  Log in as an author.
2.  View only that author's seeded books.
3.  Create a ticket.
4.  Log in as admin.
5.  Find the ticket and update its status.
6.  Add a public response.
7.  Return to author view and verify the response appears.
8.  Add an internal note as admin and verify it is not shown to the
    author.
9.  Test AI processing later without breaking the above flow.

------------------------------------------------------------------------

## 12. Implementation Phases and Order

Follow this order. Finish and verify a phase before moving on.

### Phase 0 --- Inspect and plan

-   Read the assignment PDF and inspect the actual
    `bookleaf_sample_data.json`.
-   Identify the JSON structure, relationships, fields, ID types, and
    any missing user credentials.
-   Write a brief implementation plan and call out assumptions.
-   Do not guess the dataset schema.

### Phase 1 --- Backend foundation

-   Create Node.js/Express project.
-   Configure environment and centralized error handling.
-   Connect PostgreSQL.
-   Create schema/migrations and repeatable seed script.
-   Verify that all provided authors/books load correctly.

**Exit condition:** server starts, database connects, seed is
repeatable, sample data can be queried.

### Phase 2 --- Backend core APIs

-   Implement login and role middleware.
-   Implement author book APIs.
-   Implement author ticket create/list/detail APIs.
-   Implement admin queue/filter/update/assignment/response APIs.
-   Add validation and ownership checks.
-   Add tests and endpoint documentation.

**Exit condition:** core flows work via API tests or Postman without any
frontend or AI service.

### Phase 3 --- React frontend

-   Implement login and role-aware navigation.
-   Build author books, create-ticket, and ticket-history views.
-   Build admin queue and ticket-detail views.
-   Integrate all screens with the real backend.
-   Add loading/error/empty states and polling for near-real-time
    updates.

**Exit condition:** author-to-admin ticket lifecycle works in the
browser.

### Phase 4 --- AWS SQS and Python worker

-   Configure queue, visibility timeout, DLQ and redrive policy.
-   Add background-job publishing and processing state.
-   Implement Python SQS consumer and idempotent job handling.
-   Add monitoring/logging and test retries.

**Exit condition:** a queued test job is processed reliably, including
failure scenarios.

### Phase 5 --- AI integration

-   Implement classification and priority suggestions.
-   Implement knowledge-base-grounded draft generation.
-   Validate structured LLM output.
-   Add admin review/edit/send workflow.
-   Test outage and rate-limit fallback.

**Exit condition:** AI is useful but never blocks manual ticket
management.

### Phase 6 --- Final hardening and delivery

-   Run unit, API, and end-to-end tests.
-   Verify author/admin access boundaries and internal note privacy.
-   Write README, architecture explanation, API docs, demo credentials,
    known limitations and deployment steps.
-   Deploy the app and verify it with the seeded data.
-   Prepare the assignment's brief one-page write-up.

------------------------------------------------------------------------

## 13. Deployment and Operations

Deploy the React app and Node API using suitable hosting, and use a
managed PostgreSQL service if practical. AWS SQS requires an AWS
account/region and correct IAM permissions. Run the Python worker as a
separate process/service; it must not be tied to an HTTP request
lifecycle.

Do not claim that a feature is deployed or operational unless it has
actually been tested. If an AWS account, LLM key, or deployment
credential is unavailable, implement the integration behind
configuration and clearly document what needs to be supplied.

Include: - Local setup commands. - Environment variable list. -
Migration and seed commands. - Start commands for frontend, API, and
worker. - Demo login credentials for the deployed app. - API
documentation. - A short architecture rationale. - Known limitations and
future improvements.

Do not commit `.env`, database dumps containing secrets, provider keys,
AWS credentials, or real user data.

------------------------------------------------------------------------

## 14. Coding-Agent Instructions

The coding agent should:

1.  **Inspect first.** Read the assignment PDF and sample JSON before
    implementing schemas or UI. Preserve the exact supplied records.
2.  **Work in small milestones.** Implement, run, test, and report each
    phase before proceeding.
3.  **Do not skip to AI.** Finish the backend core and verify it before
    frontend; finish frontend integration before adding SQS/Python/LLM
    features.
4.  **Do not invent requirements or data.** Mark assumptions explicitly.
    Use the assignment's exact categories, statuses, and policies.
5.  **Keep the application usable without AI.** Manual support
    operations must work if the queue or LLM is down.
6.  **Enforce authorization server-side.** Never rely only on frontend
    route hiding.
7.  **Protect internal notes and secrets.** Authors must not see
    internal notes; keys must never reach the browser or Git.
8.  **Avoid unnecessary complexity.** No vector database, microservice
    sprawl, or extra infrastructure unless a real requirement justifies
    it.
9.  **Use reliable code.** Add input validation, parameterized
    queries/ORM protections, centralized error handling, and useful
    tests.
10. **Do not fake completion.** Do not claim tests, deployment, AI
    calls, uploads, or real-time behavior work unless verified.
11. **Explain important choices.** Document why each major dependency or
    architecture decision is needed.
12. **Keep dependencies maintained and compatible.** Use stable versions
    and include lockfiles.
13. **At each milestone, report:** files changed, commands run, test
    results, known issues, and the next milestone.
14. **Ask only when blocked by a genuine missing decision or
    credential.** Otherwise make a conservative, documented choice and
    continue.
15. **Do not overwrite unrelated user work.** Inspect the existing
    repository before making structural changes; adapt to existing files
    where possible.

------------------------------------------------------------------------

## 15. Definition of Done

The assignment is ready to submit only when: - The provided sample data
is loaded and the app works with those exact records. - Authentication
and author/admin authorization work. - Author book and royalty views
work. - Authors can create and track tickets. - Admins can filter,
assign, update and respond to tickets. - Internal notes remain
private. - Frontend and backend are integrated and usable. -
Near-real-time updates work through the chosen mechanism. - SQS and
Python worker are implemented and tested if included in the final
scope. - AI classification, priority suggestions, and editable response
drafts work with safe fallback behavior. - Secrets are protected. -
Tests, README, API documentation, demo credentials, deployment, and the
brief write-up are complete.

**Priority rule:** a smaller end-to-end working system is better than a
large partially implemented system. Build in phases, verify each phase,
and keep AI as an enhancement to a reliable support workflow---not a
single point of failure.
