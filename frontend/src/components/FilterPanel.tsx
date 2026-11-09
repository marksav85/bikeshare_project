import type { FormEvent } from 'react'
import {
  Bike,
  Building2,
  ChartNoAxesCombined,
  Landmark,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react'
import type { City, CityId, FilterOptions, FilterSelection } from '../types'

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

type FilterPanelProps = {
  cities: City[]
  cityName: string
  citiesError: string | null
  draft: FilterSelection
  options: FilterOptions | null
  optionsLoading: boolean
  optionsError: string | null
  statsLoading: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCitySelect: (city: CityId) => void
  onMonthChange: (month: number | null) => void
  onWeekdayChange: (weekday: FilterSelection['weekday']) => void
  onRetryCities: () => void
  onRetryOptions: () => void
}

export function FilterPanel({
  cities,
  cityName,
  citiesError,
  draft,
  options,
  optionsLoading,
  optionsError,
  statsLoading,
  onSubmit,
  onCitySelect,
  onMonthChange,
  onWeekdayChange,
  onRetryCities,
  onRetryOptions,
}: FilterPanelProps) {
  return (
    <form onSubmit={onSubmit} className="panel rounded-xl border p-4 sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Exploratory parameters
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Filter Dataset
          </h1>
          <p className="mt-1 text-sm text-muted">
            Choose a city, month, and day of week to explore.
          </p>
        </div>
        {options && (
          <span className="rounded-full bg-chip px-3 py-1.5 text-xs text-muted">
            Active: {cities.find((city) => city.id === options.city)?.name ?? cityName}
          </span>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Select city
        </legend>
        <div
          role="radiogroup"
          aria-label="Choose city"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
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
                    <span className="block break-words text-sm font-semibold text-ink">
                      {city.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      Historical sample · ~300,000 trips
                    </span>
                  </span>
                </span>
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${selected ? 'border-primary bg-primary text-on-primary' : 'border-border text-transparent'}`}
                  aria-hidden="true"
                >
                  ✓
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>
      {citiesError && (
        <p role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-danger">
          {citiesError}
          <button
            type="button"
            onClick={onRetryCities}
            className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Retry city list
          </button>
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Month
          <select
            value={draft.month ?? ''}
            onChange={(event) =>
              onMonthChange(event.target.value ? Number(event.target.value) : null)
            }
            disabled={!options || optionsLoading}
            className="filter-control mt-2 block h-11 w-full rounded-lg border px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            <option value="">All Months</option>
            {options?.months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Day of week
          <select
            value={draft.weekday ?? ''}
            onChange={(event) =>
              onWeekdayChange((event.target.value || null) as FilterSelection['weekday'])
            }
            disabled={!options || optionsLoading}
            className="filter-control mt-2 block h-11 w-full rounded-lg border px-3 text-sm font-normal normal-case tracking-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            <option value="">All Days</option>
            {options?.weekdays.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={optionsLoading || !options}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 lg:min-w-48"
        >
          {statsLoading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
          ) : (
            <ChartNoAxesCombined aria-hidden="true" size={17} />
          )}
          {statsLoading ? 'Analyzing…' : 'Analyze Trips'}
        </button>
      </div>
      {optionsError && (
        <p role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm text-danger">
          {optionsError}
          <button
            type="button"
            onClick={onRetryOptions}
            className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Retry filter options
          </button>
        </p>
      )}
    </form>
  )
}
