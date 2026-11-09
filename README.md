# BikeShare Explorer — Interactive Bike-Share Data Dashboard

BikeShare Explorer is a full-stack data visualization application for exploring historical bike-share journeys in Chicago, New York City and Washington. Originally developed as a Python command-line analysis project, it has been modernized with React, FastAPI and pandas to provide interactive filtering, journey statistics and visual insights through a responsive web dashboard.

**[Explore the live application](https://bikeshare.marksavilledesigns.com/)**

## Features

- **Three-city exploration:** Analyze historical bike-share journeys from Chicago, New York City and Washington using datasets covering January to June 2017.

- **Interactive filtering:** Select a city, month and day of the week to explore different journey patterns.

- **Journey statistics:** View trip counts, average and total journey durations, and the most popular travel times.

- **Data visualizations:** Explore hourly and weekday travel patterns and rider-type distributions through interactive Recharts visualizations.

- **Station and route rankings:** Discover the most frequently used starting stations, destination stations and routes.

- **Rider demographics:** Explore gender and birth-year statistics where supported by the original datasets.

- **Responsive interface and themes:** Use the dashboard across desktop and mobile layouts, with Midnight Cyan and Urban Sage appearance options.

- **Loading and error handling:** Receive clear feedback while data loads, when requests fail or when a selected filter produces no results.

## Technology Stack

| Area                    | Technologies                            |
| ----------------------- | --------------------------------------- |
| Frontend                | React, TypeScript, Vite, Tailwind CSS 4 |
| Data visualization      | Recharts                                |
| Backend                 | Python 3.12, FastAPI, Uvicorn           |
| Data processing         | pandas                                  |
| API communication       | REST API, JSON                          |
| Containerization        | Docker, Docker Compose                  |
| Web serving and hosting | Nginx, Caddy, Contabo VPS               |
| Testing and quality     | pytest, HTTPX, Vitest, Prettier, ESLint, TypeScript |

## Technical Highlights

### Modernizing a Python data-analysis project

BikeShare Explorer builds on an original Python command-line application created in 2020. The modernization preserves the original interactive CLI while introducing reusable backend modules for data loading, filtering and statistical analysis.

Separating the analysis logic from command-line interaction allows the same underlying data-processing functionality to support a modern web application without discarding the original implementation.

### Data processing and statistical analysis

The pandas backend loads and validates historical CSV datasets, normalizes relevant fields and calculates statistics based on selected city, month and weekday filters.

The analysis includes journey durations, popular travel times, station rankings, route frequencies and available rider demographics. Missing values and differences between city datasets are handled without inventing unavailable statistics.

### REST API and efficient data access

FastAPI exposes the analysis through a structured REST API, providing city information, available filters and calculated statistics as JSON responses.

City datasets are loaded on demand and cached in memory, avoiding repeated CSV parsing for subsequent requests. Dedicated health and readiness endpoints distinguish application availability from basic dataset accessibility.

Input validation and consistent error responses help keep the frontend independent of internal data-processing details.

### Interactive React dashboard

The React and TypeScript frontend turns the statistical results into an interactive exploration experience.

Users can apply filters, compare journey patterns and inspect charts and rankings without working directly with Python or CSV files. Recharts provides responsive data visualizations, while Tailwind CSS and shared theme variables support consistent layouts and light/dark appearance options.

The interface includes explicit loading, error and empty-result states, along with feedback when the user's current filter selections differ from the displayed results.

### Containerized full-stack architecture

The application uses separate Docker containers for its frontend and backend.

Nginx serves the compiled React application and forwards same-origin API requests to FastAPI over a private Docker network. An external Caddy reverse proxy provides HTTPS access to the deployed frontend.

The backend does not publish a host port, and the historical CSV datasets are included only in the backend image. This separates public presentation from the data-processing service and its source files.

## Architecture

BikeShare Explorer separates the presentation layer, API and data-analysis logic:

- **React and TypeScript** provide the interactive dashboard, filters, charts and user-interface state.

- **FastAPI** validates requests and exposes statistical results through JSON endpoints.

- **pandas** loads the historical datasets, applies filters and calculates journey statistics.

- **Nginx** serves the production frontend and proxies `/api/` requests to the backend.

- **Docker Compose** manages the application containers and private networking.

- **Caddy** provides HTTPS routing for the deployed application.

The browser communicates with the backend through same-origin `/api/` requests. The application is read-only and requires no user accounts, database or external data service.

## Getting Started

The project requires Python 3.12, Node.js 22 with npm, and the three historical CSV datasets included in the repository.

From the repository root, create the backend environment and install its dependencies:

```
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e 'backend/.[dev]'
```

Install the frontend dependencies:

```
cd frontend
npm ci
cd ..
```

Start both local development servers from the repository root:

```
./scripts/dev.sh
```

Open the frontend URL displayed by Vite. The backend listens at `http://127.0.0.1:8000`, with interactive API documentation at `http://127.0.0.1:8000/docs`. During development, Vite forwards `/api/` requests to FastAPI. Press Ctrl+C to stop both servers.

### Testing and verification

Run the backend test suite from the `backend/` directory:

```
cd backend
.venv/bin/python -m pytest -v
```

Run frontend tests, formatting, linting and production build checks from `frontend/`:

```
cd ../frontend
npm run test
npm run format:check
npm run lint
npm run build
```

The production build runs TypeScript project checking before Vite creates the static assets.

## Project Status

BikeShare Explorer is deployed as a live portfolio application.

The dashboard uses a fixed historical dataset rather than live bike-share information. It provides aggregated journey statistics and does not include individual-trip browsing, user accounts or data editing.

## Credits

BikeShare originated as a Python data-analysis exercise completed in October 2020 for the Udacity — Programming for Data Science with Python Nanodegree Program. The modern web application builds on that foundation while preserving the original CLI and extending the project with an API, interactive visualizations and containerized deployment.
