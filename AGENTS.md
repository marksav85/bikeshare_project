# AGENTS.md — BikeShare

## 1\. Project Overview

BikeShare is an existing Python data-analysis project originally developed in October 2020.

The application analyzes historical bike-sharing journeys across Chicago, New York City and Washington using pandas and three local CSV datasets.

The original application is a command-line program that supports city, month and weekday filtering and calculates travel-time, station, trip-duration and rider statistics.

The project is being modernized into a small, publicly accessible, full-stack portfolio application.

### Approved modernization direction

- **Frontend:** React, TypeScript and Vite.

- **Backend:** Python and FastAPI.

- **Data analysis:** pandas, preserving existing calculations where practical.

- **Data storage:** Existing local CSV files; no database initially.

- **Hosting:** Existing Contabo VPS, with Nginx as the intended reverse proxy.

- **User experience:** Interactive, read-only statistical dashboard.

The modernization should demonstrate Python data analysis, API development, frontend development and full-stack integration.

The objective is targeted modernization, not a complete rewrite.

## 2\. Architecture and Repository Structure

The original project consists primarily of `bikeshare_project.py` and three CSV datasets.

The intended architecture separates:

1.  **Data access:** Loading and validating local CSV datasets.

2.  **Analysis:** Filtering records and calculating statistics.

3.  **API:** Exposing analysis functionality through FastAPI.

4.  **Frontend:** Presenting interactive controls, results and visualizations through React.

The final directory structure has not yet been implemented.

Inspect the current repository before making changes. Do not assume that planned directories, tools, configuration files or services already exist.

Prefer a simple, maintainable architecture appropriate to a small portfolio application.

Do not introduce databases, authentication, background processing, additional frameworks or unnecessary abstractions without a demonstrated requirement and approval.

## 3\. Functionality and Preservation

Preserve the existing application's analytical purpose and relevant functionality.

Core requirements include:

- Selection between Chicago, New York City and Washington.

- Filtering by available month and weekday values.

- Trip counts and travel-time statistics.

- Total and average trip duration.

- Popular starting stations, ending stations and routes.

- Rider-type statistics and available demographic information.

- Clear handling of cities with different dataset schemas.

The approved frontend expansion includes interactive filtering, summary cards and useful charts or rankings.

Additional aggregations may be implemented where necessary to support these approved visualizations.

### Out of scope

Unless separately authorized:

- Dataset editing.

- User accounts or authentication.

- Individual trip-record browsing.

- Database migration.

- Real-time data integrations.

- Advanced predictive analytics.

- Substantial new analytical features or datasets.

Preserve the original datasets and meaningful analytical behaviour. Changes to data sources, calculation definitions or historical functionality require explicit justification and approval.

Dataset provenance, licensing and redistribution permissions must be verified before public deployment.

## 4\. MSD Projects Playbook

Follow the relevant MSD Projects Playbook standards and workflows.

The Playbook is maintained in a separate Git repository:

`/home/marksav85-x1/Development/projects--development/msd-projects-playbook`

Relevant documentation includes:

- `development/0-existing-projects/project-assessment/`

- `development/0-existing-projects/portfolio-modernization/`

- `standard--portfolio-agents.md`

- `workflow--portfolio-refactor.md`

- `01-controller--portfolio-modernization.md`

Use the actual document locations within the Playbook if paths differ.

The Portfolio Modernization Controller coordinates the overall workflow. The Portfolio Refactoring Workflow governs approved implementation tasks.

Use applicable Development procedures for frontend development, backend integration, testing and deployment where relevant.

Do not repeat completed assessments unless new evidence establishes a genuine need.

The Playbook is reference documentation, not part of the BikeShare repository.

## 5\. Codex Working Standards

Follow `standard--portfolio-agents.md` and applicable Playbook code-quality standards.

### Before implementation

- Identify the authorized task and its boundaries.

- Inspect the relevant current code and configuration.

- Review applicable Playbook instructions.

- Identify important behaviour and files to preserve.

- Consider relevant risks and verification requirements.

### During implementation

- Make focused changes that directly support the approved task.

- Preserve unrelated functionality and files.

- Prefer readable, maintainable code over unnecessary abstraction.

- Reuse existing functionality where appropriate.

- Keep data processing, API handling and frontend presentation logically separated.

- Avoid speculative features, unnecessary dependencies and broad refactoring.

- Preserve pre-existing uncommitted changes.

### After implementation

- Run relevant, proportionate checks when authorized.

- Report changes made and verification performed.

- Identify unresolved issues and important assumptions.

- Explain any deviations from the approved scope.

- Stop at the defined approval boundary.

Do not treat recommendations from assessments as authorization to implement additional changes.

## 6\. Testing and Verification

Testing should reflect the scope and risk of each change.

Relevant verification may include:

- Python data-loading and filtering tests.

- Statistical calculation and regression tests.

- Empty-result and invalid-input handling.

- Differences between the three city datasets.

- FastAPI endpoint and response validation.

- Frontend build, type-checking and interaction tests.

- Frontend/backend integration checks.

- Responsive layout and accessibility review.

- Deployment and service verification when separately authorized.

Prefer focused tests that demonstrate meaningful behaviour.

Do not add elaborate testing infrastructure without clear value.

Do not claim functionality is verified unless the relevant checks have actually been performed.

## 7\. Data Handling

The project contains three historical CSV datasets totaling approximately 900,000 records.

- Treat datasets as read-only application inputs.

- Do not modify, regenerate or replace source datasets without authorization.

- Use explicit data paths rather than fragile working-directory assumptions.

- Validate supported city identifiers and filter parameters.

- Handle missing values, empty results and unavailable demographic fields deliberately.

- Avoid unnecessary repeated loading or copying of large DataFrames.

- Measure performance before introducing caching, preprocessing or database storage.

- Do not expose local filesystem paths or internal exceptions through the public API.

- Do not transmit datasets to external services without authorization.

Public dataset use, attribution and redistribution must be supported by verified provenance and licensing information.

## 8\. Deployment

The intended production environment is the existing Contabo VPS.

The anticipated arrangement is:

- Nginx serves the compiled React frontend.

- Nginx proxies `/api/` requests to FastAPI.

- FastAPI runs as a managed local service.

- CSV datasets remain outside publicly accessible static directories.

The VPS hosts other applications.

Deployment work must preserve existing services, routing and configuration.

Do not assume VPS configuration, available resources or deployment conventions without verification.

Do not access or modify the VPS unless the current task explicitly authorizes the relevant operation.

Never deploy, restart production services, alter shared Nginx configuration or modify infrastructure merely because an implementation task has been completed.

Deployment requires separate owner approval.

## 9\. Workspace and Git Safety

Follow the global Codex workspace safety policy:

`global-codex-workspace-safety.md`

### Repository boundaries

- The active BikeShare Git repository is the only repository that may be modified by Codex in this workspace.

- External repositories are separate protected boundaries.

- The MSD Projects Playbook is a read-only reference repository.

- Never modify another Git repository from a BikeShare Codex session.

- Do not create temporary clones, worktrees or automation to bypass these boundaries.

### External reference access

Read-only Playbook access is covered by the standing YELLOW FLAG authorization in the global policy.

Before the first Playbook read in a session, provide the required informational notice.

Do not copy Playbook documentation into BikeShare or create a Playbook submodule merely to access reference material.

Other external filesystem access remains subject to the global workspace safety rules.

### Git operations

Unless explicitly authorized:

- Do not commit or push.

- Do not merge branches.

- Do not rewrite Git history.

- Do not reset or discard user changes.

- Do not delete or reorganize unrelated files.

- Do not perform deployment operations.

Preserve existing work and report unexpected repository conditions.

## 10\. Approval and Scope Control

The project owner has approved the overall modernization direction:

**Existing Python analysis → FastAPI backend → interactive React dashboard → deployment on the existing VPS.**

This establishes project direction, not blanket permission to execute the entire modernization.

Each Codex task must have a defined objective, implementation scope and verification requirements.

Request approval before:

- Major architectural changes.

- Material changes to existing analytical behaviour.

- Introducing significant new dependencies or services.

- Expanding functionality beyond the agreed dashboard.

- Destructive repository cleanup.

- Dataset replacement or publication decisions.

- Production deployment or infrastructure changes.

Ordinary implementation decisions within an explicitly approved task may proceed without repeated approval.

## 11\. Documentation and Finalization

Keep documentation accurate and proportional to the project's complexity.

During development, document only what is necessary to support implementation and maintenance.

After modernization, follow the Playbook's portfolio-finalization procedures, including:

- Repository cleanup audit.

- Code-quality and verification review.

- Portfolio README preparation.

- Development Handbook.

- Operations Runbook.

- Playbook Reference Case.

- Final portfolio-readiness checklist.

Use the relevant Playbook standards for these deliverables.

Do not prepare final documentation prematurely or duplicate the entire Playbook inside the repository.

## 12\. Guiding Principle

**Preserve the useful Python data-analysis project, expose its functionality through a small and maintainable full-stack application, and implement only changes that improve reliability, usability or portfolio value.**

Keep the solution proportionate to the project's size and approved goals.
