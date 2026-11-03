import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Bike,
  Building2,
  ChartNoAxesCombined,
  Clock3,
  Database,
  Landmark,
  LoaderCircle,
  MapPin,
  Moon,
  Route,
  Sun,
  Timer,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fetchCities, fetchFilters, fetchStatistics } from './api'
import type { City, CityId, FilterOptions, FilterSelection, Statistics } from './types'
import { Panel } from './components/Panel'

const HourlyChart = lazy(() => import('./components/Charts').then((module) => ({ default: module.HourlyChart })))
const WeekdayChart = lazy(() => import('./components/Charts').then((module) => ({ default: module.WeekdayChart })))
const RiderChart = lazy(() => import('./components/Charts').then((module) => ({ default: module.RiderChart })))

const DEFAULT_SELECTION: FilterSelection = {
  city: 'chicago',
  month: null,
  weekday: null,
}

const CITY_ACCENTS: Record<CityId, string> = {
  chicago: 'city-chicago',
  new_york_city: 'city-new-york',
  washington: 'city-washington',
}

const CITY_ICONS: Record<CityId, LucideIcon> = {
  chicago: Bike,
  new_york_city: Building2,
  washington: Landmark,
}


function readInitialTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('bikeshare-theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDuration(seconds: number | null, unit: 'minutes' | 'hours'): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const value = seconds / (unit === 'minutes' ? 60 : 3600)
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} ${unit === 'minutes' ? 'min' : 'hrs'}`
}

function formatHour(hour: number | undefined): string {
  if (hour === undefined) return '—'
  const start = new Date(2000, 0, 1, hour)
  const end = new Date(2000, 0, 1, hour + 1)
  const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric' })
  return `${formatter.format(start)}–${formatter.format(end)}`
}

function MetricCard({
  label,
  value,
  footnote,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  footnote: string
  icon: LucideIcon
  accent: string
}) {
  return (
    <article className={`metric-card ${accent} rounded-xl border p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.11em] text-muted">{label}</h2>
        <Icon aria-hidden="true" className="text-primary" size={17} />
      </div>
      <p className="mt-4 font-mono text-2xl font-semibold tracking-tight text-ink sm:text-[1.8rem]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">{footnote}</p>
    </article>
  )
}

function RankingList({
  title,
  rows,
  kind,
  icon: Icon,
}: {
  title: string
  rows: { station: string; trips: number }[] | { start_station: string; end_station: string; trips: number }[]
  kind: 'station' | 'route'
  icon: LucideIcon
}) {
  return (
    <Panel title={title} icon={Icon}>
      {rows.length === 0 ? (
        <p className="py-8 text-sm text-muted">No ranking data for these filters.</p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.slice(0, 5).map((row, index) => (
            <li key={kind === 'station' ? `${index}-${(row as { station: string }).station}` : `${index}-${(row as { start_station: string }).start_station}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 py-3 first:pt-0 last:pb-0">
              <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 break-words text-sm leading-relaxed text-ink">
                {kind === 'station'
                  ? (row as { station: string }).station
                  : <>{(row as { start_station: string }).start_station}<span className="mx-1 text-primary">→</span>{(row as { end_station: string }).end_station}</>}
              </span>
              <span className="whitespace-nowrap font-mono text-xs text-muted">{formatCount(row.trips)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function Demographics({ stats }: { stats: Statistics }) {
  const gender = stats.demographics.gender
  const birth = stats.demographics.birth_year
  const genderTotal = gender.counts.reduce((sum, item) => sum + item.trips, 0)
  return (
    <Panel title="Rider Demographics" subtitle="Available fields and recorded values for this city" icon={UsersRound}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Gender</h3>
          {!gender.available ? (
            <UnavailableMessage />
          ) : genderTotal === 0 ? (
            <p className="rounded-lg bg-inset p-3 text-sm text-muted">No reported gender values in these trips.</p>
          ) : (
            <div className="space-y-3">
              {gender.counts.map((item, index) => (
                <div key={item.value}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="text-ink">{item.value}</span>
                    <span className="font-mono text-xs text-muted">{formatCount(item.trips)} · {((item.trips / genderTotal) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-inset">
                    <div className={`h-full rounded-full ${index === 0 ? 'bg-chart-cyan' : index === 1 ? 'bg-chart-green' : 'bg-chart-violet'}`} style={{ width: `${(item.trips / genderTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">Missing values: {formatCount(gender.missing_count ?? 0)}</p>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Birth year</h3>
          {!birth.available ? (
            <UnavailableMessage />
          ) : birth.min === null || birth.min === undefined ? (
            <p className="rounded-lg bg-inset p-3 text-sm text-muted">No reported birth years in these trips.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-2">
              <DemographicStat label="Earliest" value={String(birth.min)} />
              <DemographicStat label="Latest" value={String(birth.max)} />
              <DemographicStat label="Most common" value={String(birth.mode)} />
              <DemographicStat label="Missing values" value={formatCount(birth.missing_count ?? 0)} />
            </dl>
          )}
        </div>
      </div>
      {(!gender.available || !birth.available) && (
        <p className="mt-5 rounded-lg border border-border bg-inset px-3 py-2.5 text-xs leading-relaxed text-muted">
          Demographic fields are not present in the Washington source dataset.
        </p>
      )}
    </Panel>
  )
}

function ChartLoading() {
  return <div className="panel min-h-80 animate-pulse rounded-xl border" aria-label="Loading charts" />
}

function UnavailableMessage() {
  return <p className="rounded-lg bg-inset p-3 text-sm text-muted">This field is not available in the source dataset.</p>
}

function DemographicStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-inset p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

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
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#0b1326' : '#eff2f8',
    )
    try {
      localStorage.setItem('bikeshare-theme', theme)
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }, [theme])

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
  const peakHour = stats?.popular_travel_times.hour[0]?.hour
  const filtersChanged = stats && (
    stats.city !== draft.city ||
    stats.filters.month !== draft.month ||
    stats.filters.weekday !== draft.weekday
  )

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors duration-200">
      <header className="border-b border-border bg-header">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#main" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
              <Bike aria-hidden="true" size={22} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-tight text-ink sm:text-lg">BikeShare Explorer</span>
              <span className="hidden text-xs text-muted sm:block">Discover how cities move</span>
            </span>
            <span className="hidden rounded-full bg-chip px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted lg:inline-flex">Historical archive · Jan–Jun 2017</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-muted sm:flex"><span className="size-2 rounded-full bg-chart-green" />Historical trip data</span>
            <button
              type="button"
              onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-ink transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-8 lg:px-8">
        <form onSubmit={onSubmit} className="panel rounded-xl border p-4 sm:p-6 lg:p-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Exploratory parameters</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Filter Dataset</h1>
              <p className="mt-1 text-sm text-muted">Choose a city, month, and day of week to explore.</p>
            </div>
            {options && <span className="rounded-full bg-chip px-3 py-1.5 text-xs text-muted">Active: {cities.find((city) => city.id === options.city)?.name ?? cityName}</span>}
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Select city</legend>
            <div role="radiogroup" aria-label="Choose city" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {cities.map((city) => {
                const Icon = CITY_ICONS[city.id]
                const selected = city.id === draft.city
                return (
                  <button
                    key={city.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onCitySelect(city.id)}
                    className={`city-option ${CITY_ACCENTS[city.id]} group flex min-h-20 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'city-selected' : ''}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon aria-hidden="true" className="shrink-0 text-primary" size={19} />
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold text-ink">{city.name}</span>
                        <span className="mt-1 block text-xs text-muted">Historical sample · ~300,000 trips</span>
                      </span>
                    </span>
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${selected ? 'border-primary bg-primary text-on-primary' : 'border-border text-transparent'}`} aria-hidden="true">✓</span>
                  </button>
                )
              })}
            </div>
          </fieldset>
          {citiesError && (
            <p role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-danger">
              {citiesError}
              <button type="button" onClick={retryCities} className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">Retry city list</button>
            </p>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Month
              <select
                value={draft.month ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, month: event.target.value ? Number(event.target.value) : null }))}
                disabled={!options || optionsLoading}
                className="filter-control mt-2 block h-11 w-full rounded-lg border px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
              >
                <option value="">All Months</option>
                {options?.months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Day of week
              <select
                value={draft.weekday ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, weekday: (event.target.value || null) as FilterSelection['weekday'] }))}
                disabled={!options || optionsLoading}
                className="filter-control mt-2 block h-11 w-full rounded-lg border px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
              >
                <option value="">All Days</option>
                {options?.weekdays.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
              </select>
            </label>
            <button
              type="submit"
              disabled={optionsLoading || !options}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 lg:min-w-48"
            >
              {statsLoading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <ChartNoAxesCombined aria-hidden="true" size={17} />}
              {statsLoading ? 'Analyzing…' : 'Analyze Trips'}
            </button>
          </div>
          {optionsError && (
            <p role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-danger">
              {optionsError}
              <button type="button" onClick={retryOptions} className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">Retry filter options</button>
            </p>
          )}
        </form>

        {statsError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <span>{statsError}</span>
            <button type="button" onClick={() => void analyze(draft)} className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">Retry analysis</button>
          </div>
        )}

        {statsLoading && !stats && (
          <div role="status" aria-live="polite" className="panel flex min-h-36 items-center justify-center gap-3 rounded-xl border text-sm text-muted">
            <LoaderCircle aria-hidden="true" className="animate-spin text-primary" size={20} /> Loading trip analysis…
          </div>
        )}

        {stats && (
          <div aria-busy={statsLoading} className="space-y-6 lg:space-y-8">
            {filtersChanged && (
              <p className="rounded-lg border border-border bg-inset px-4 py-2.5 text-xs text-muted">
                Results below reflect the last analyzed filters. Select Analyze Trips to apply your current choices.
              </p>
            )}
            {stats.trip_count === 0 && (
              <div role="status" className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-ink">
                No trips match these filters. Try another month or weekday.
              </div>
            )}

            <section aria-label="Trip summary metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard label="Total trips" value={formatCount(stats.trip_count)} footnote="Trips matching the selected filters" icon={Bike} accent="metric-cyan" />
              <MetricCard label="Average trip duration" value={formatDuration(stats.duration_seconds.average, 'minutes')} footnote="Mean duration per matching trip" icon={Timer} accent="metric-green" />
              <MetricCard label="Total trip duration" value={formatDuration(stats.duration_seconds.total, 'hours')} footnote="Combined duration of matching trips" icon={Clock3} accent="metric-violet" />
              <MetricCard label="Most popular travel hour" value={formatHour(peakHour)} footnote={peakHour === undefined ? 'No hour data for this result' : `Most trips started during hour ${peakHour}`} icon={ChartNoAxesCombined} accent="metric-orange" />
            </section>

            <section aria-label="Trip frequency charts" className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <Suspense fallback={<ChartLoading />}><HourlyChart stats={stats} /><WeekdayChart stats={stats} /></Suspense>
            </section>

            <section aria-labelledby="rankings-heading">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Station network</p>
                  <h2 id="rankings-heading" className="mt-1 text-lg font-semibold tracking-tight text-ink">Popular Stations &amp; Routes</h2>
                </div>
                <p className="text-xs text-muted">Top five by trip count</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <RankingList title="Top Starting Stations" rows={stats.popular_stations.start} kind="station" icon={MapPin} />
                <RankingList title="Top Ending Stations" rows={stats.popular_stations.end} kind="station" icon={MapPin} />
                <RankingList title="Top Routes" rows={stats.popular_routes} kind="route" icon={Route} />
              </div>
            </section>

            <section aria-label="Rider information" className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
              <Suspense fallback={<ChartLoading />}><RiderChart stats={stats} /></Suspense>
              <Demographics stats={stats} />
            </section>
          </div>
        )}

        <section aria-labelledby="about-heading" className="panel grid gap-5 rounded-xl border p-5 sm:p-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">Data source &amp; methodology</p>
            <h2 id="about-heading" className="mt-1 text-lg font-semibold tracking-tight text-ink sm:text-xl">About the BikeShare Dataset</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              This dashboard explores historical bike-sharing trip samples for Chicago, New York City, and Washington from January through June 2017. Each city file contains approximately 300,000 source records. Statistics are calculated with Python and pandas and served by FastAPI to this React dashboard. This is historical trip data; it does not show live bicycle availability.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2.5 py-1.5"><Database size={13} /> Python &amp; pandas</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2.5 py-1.5"><Route size={13} /> FastAPI</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2.5 py-1.5"><Bike size={13} /> React &amp; Recharts</span>
            </div>
          </div>
          <div className="rounded-lg bg-inset p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted"><Database size={14} /> Source summary</p>
            <ul className="space-y-2 text-sm">
              {cities.map((city) => (
                <li key={city.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-ink">{city.name}</span><span className="whitespace-nowrap font-mono text-xs text-muted">~300,000 records</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold text-ink"><span>Combined sample</span><span className="font-mono text-primary">~900,000 trips</span></p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-header">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-semibold text-ink">BikeShare Explorer <span className="font-normal text-muted">· Historical Archive (2017)</span></span>
          <span className="flex items-center gap-2"><UsersRound size={14} /> City focus: {cityName}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
