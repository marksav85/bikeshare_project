import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Bike, Database, MapPin, Moon, Route, Sun, UsersRound, LoaderCircle } from 'lucide-react'
import { fetchCities, fetchFilters, fetchStatistics } from './api'
import type { City, CityId, FilterOptions, FilterSelection, Statistics } from './types'
import { FilterPanel } from './components/FilterPanel'
import { Demographics, MetricCards, RankingList } from './components/Statistics'

const HourlyChart = lazy(() =>
  import('./components/Charts').then((module) => ({ default: module.HourlyChart })),
)
const WeekdayChart = lazy(() =>
  import('./components/Charts').then((module) => ({ default: module.WeekdayChart })),
)
const RiderChart = lazy(() =>
  import('./components/Charts').then((module) => ({ default: module.RiderChart })),
)

const DEFAULT_SELECTION: FilterSelection = {
  city: 'chicago',
  month: null,
  weekday: null,
}

function readInitialTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('bikeshare-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function ChartLoading() {
  return (
    <div className="panel min-h-80 animate-pulse rounded-xl border" aria-label="Loading charts" />
  )
}

// Dashboard state, data loading, filter actions, and page composition.
function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(readInitialTheme)
  const [cities, setCities] = useState<City[]>([])
  const [citiesError, setCitiesError] = useState<string | null>(null)
  const [citiesRetry, setCitiesRetry] = useState(0)
  const [draft, setDraft] = useState<FilterSelection>(DEFAULT_SELECTION)
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsRetry, setOptionsRetry] = useState(0)
  const [stats, setStats] = useState<Statistics | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const activeStatsRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1326' : '#eff2f8')
    try {
      localStorage.setItem('bikeshare-theme', theme)
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }, [theme])

  // Fetch city and filter data; cleanup cancels requests when their inputs change.
  useEffect(() => {
    const controller = new AbortController()
    fetchCities(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setCities(response.cities)
          setCitiesError(null)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCitiesError(error instanceof Error ? error.message : 'Could not load cities.')
        }
      })
    return () => controller.abort()
  }, [citiesRetry])

  useEffect(() => {
    const controller = new AbortController()
    fetchFilters(draft.city, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setOptions(response)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOptionsError(error instanceof Error ? error.message : 'Could not load filter options.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsLoading(false)
      })
    return () => controller.abort()
  }, [draft.city, optionsRetry])

  // Keep only the latest analysis request active to avoid showing stale results.
  const analyze = useCallback(async (selection: FilterSelection) => {
    activeStatsRequest.current?.abort()
    const controller = new AbortController()
    activeStatsRequest.current = controller
    setStats(null)
    setStatsError(null)
    setStatsLoading(true)
    try {
      const response = await fetchStatistics(selection, controller.signal)
      if (!controller.signal.aborted) setStats(response)
    } catch (error) {
      if (!controller.signal.aborted) {
        setStatsError(error instanceof Error ? error.message : 'Could not load trip statistics.')
      }
    } finally {
      if (!controller.signal.aborted) setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void analyze(DEFAULT_SELECTION), 0)
    return () => {
      window.clearTimeout(timer)
      activeStatsRequest.current?.abort()
    }
  }, [analyze])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void analyze(draft)
  }

  const onCitySelect = (city: CityId) => {
    setOptionsLoading(true)
    setOptionsError(null)
    setOptions(null)
    setDraft({ city, month: null, weekday: null })
  }

  const onMonthChange = (month: number | null) => {
    setDraft((current) => ({ ...current, month }))
  }

  const onWeekdayChange = (weekday: FilterSelection['weekday']) => {
    setDraft((current) => ({ ...current, weekday }))
  }

  // Retry counters rerun the same loading effects instead of adding separate fetch paths.
  const retryCities = () => {
    setCitiesError(null)
    setCitiesRetry((count) => count + 1)
  }

  const retryOptions = () => {
    setOptionsLoading(true)
    setOptionsError(null)
    setOptionsRetry((count) => count + 1)
  }

  const cityName = cities.find((city) => city.id === draft.city)?.name ?? 'BikeShare'
  const filtersChanged =
    stats &&
    (stats.city !== draft.city ||
      stats.filters.month !== draft.month ||
      stats.filters.weekday !== draft.weekday)

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors duration-200">
      {/* Application header and theme controls */}
      <header className="border-b border-border bg-header">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a
            href="#main"
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
              <Bike aria-hidden="true" size={22} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
                BikeShare Explorer
              </span>
              <span className="hidden text-xs text-muted sm:block">Discover how cities move</span>
            </span>
            <span className="hidden rounded-full bg-chip px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted lg:inline-flex">
              Historical archive · Jan–Jun 2017
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-muted sm:flex">
              <span className="size-2 rounded-full bg-chart-green" />
              Historical trip data
            </span>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-ink transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" size={18} />
              ) : (
                <Moon aria-hidden="true" size={18} />
              )}
            </button>
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-8 lg:px-8"
      >
        <FilterPanel
          cities={cities}
          cityName={cityName}
          citiesError={citiesError}
          draft={draft}
          options={options}
          optionsLoading={optionsLoading}
          optionsError={optionsError}
          statsLoading={statsLoading}
          onSubmit={onSubmit}
          onCitySelect={onCitySelect}
          onMonthChange={onMonthChange}
          onWeekdayChange={onWeekdayChange}
          onRetryCities={retryCities}
          onRetryOptions={retryOptions}
        />

        {/* Analysis feedback, summary results, and visualizations */}
        {statsError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <span>{statsError}</span>
            <button
              type="button"
              onClick={() => void analyze(draft)}
              className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Retry analysis
            </button>
          </div>
        )}

        {statsLoading && !stats && (
          <div
            role="status"
            aria-live="polite"
            className="panel flex min-h-36 items-center justify-center gap-3 rounded-xl border text-sm text-muted"
          >
            <LoaderCircle aria-hidden="true" className="animate-spin text-primary" size={20} />{' '}
            Loading trip analysis…
          </div>
        )}

        {stats && (
          <div aria-busy={statsLoading} className="space-y-6 lg:space-y-8">
            {filtersChanged && (
              <p className="rounded-lg border border-border bg-inset px-4 py-2.5 text-xs text-muted">
                Results below reflect the last analyzed filters. Select Analyze Trips to apply your
                current choices.
              </p>
            )}
            {stats.trip_count === 0 && (
              <div
                role="status"
                className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-ink"
              >
                No trips match these filters. Try another month or weekday.
              </div>
            )}

            <MetricCards stats={stats} />

            <section
              aria-label="Trip frequency charts"
              className="grid gap-4 xl:grid-cols-[1.45fr_1fr]"
            >
              <Suspense fallback={<ChartLoading />}>
                <HourlyChart stats={stats} />
                <WeekdayChart stats={stats} />
              </Suspense>
            </section>

            <section aria-labelledby="rankings-heading">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Station network
                  </p>
                  <h2
                    id="rankings-heading"
                    className="mt-1 text-lg font-semibold tracking-tight text-ink"
                  >
                    Popular Stations &amp; Routes
                  </h2>
                </div>
                <p className="text-xs text-muted">Top five by trip count</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <RankingList
                  title="Top Starting Stations"
                  rows={stats.popular_stations.start}
                  kind="station"
                  icon={MapPin}
                />
                <RankingList
                  title="Top Ending Stations"
                  rows={stats.popular_stations.end}
                  kind="station"
                  icon={MapPin}
                />
                <RankingList
                  title="Top Routes"
                  rows={stats.popular_routes}
                  kind="route"
                  icon={Route}
                />
              </div>
            </section>

            <section
              aria-label="Rider information"
              className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]"
            >
              <Suspense fallback={<ChartLoading />}>
                <RiderChart stats={stats} />
              </Suspense>
              <Demographics stats={stats} />
            </section>
          </div>
        )}

        {/* Dataset context and application footer */}
        <section
          aria-labelledby="about-heading"
          className="panel grid gap-5 rounded-xl border p-5 sm:p-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
              Data source &amp; methodology
            </p>
            <h2
              id="about-heading"
              className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-xl"
            >
              About the BikeShare Dataset
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              This dashboard explores historical bike-sharing trip samples for Chicago, New York
              City, and Washington from January through June 2017. Each city file contains
              approximately 300,000 source records. Statistics are calculated with Python and pandas
              and served by FastAPI to this React dashboard. This is historical trip data; it does
              not show live bicycle availability.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2.5 py-1.5">
                <Database size={13} /> Python &amp; pandas
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2.5 py-1.5">
                <Route size={13} /> FastAPI
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2.5 py-1.5">
                <Bike size={13} /> React &amp; Recharts
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-inset p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              <Database size={14} /> Source summary
            </p>
            <ul className="space-y-2 text-sm">
              {cities.map((city) => (
                <li
                  key={city.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-ink">{city.name}</span>
                  <span className="whitespace-nowrap font-mono text-xs text-muted">
                    ~300,000 records
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold text-ink">
              <span>Combined sample</span>
              <span className="font-mono text-primary">~900,000 trips</span>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-header">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-semibold text-ink">
            BikeShare Explorer{' '}
            <span className="font-normal text-muted">· Historical Archive (2017)</span>
          </span>
          <span className="flex items-center gap-2">
            <UsersRound size={14} /> City focus: {cityName}
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
