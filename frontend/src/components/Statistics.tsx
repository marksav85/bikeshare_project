import type { ReactNode } from 'react'
import { Bike, ChartNoAxesCombined, Clock3, Timer, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Panel } from './Panel'
import type { Statistics as StatisticsData } from '../types'

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

export function MetricCards({ stats }: { stats: StatisticsData }) {
  const peakHour = stats.popular_travel_times.hour[0]?.hour

  return (
    <section aria-label="Trip summary metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <MetricCard
        label="Total trips"
        value={formatCount(stats.trip_count)}
        footnote="Trips matching the selected filters"
        icon={Bike}
        accent="metric-cyan"
      />
      <MetricCard
        label="Average trip duration"
        value={formatDuration(stats.duration_seconds.average, 'minutes')}
        footnote="Mean duration per matching trip"
        icon={Timer}
        accent="metric-green"
      />
      <MetricCard
        label="Total trip duration"
        value={formatDuration(stats.duration_seconds.total, 'hours')}
        footnote="Combined duration of matching trips"
        icon={Clock3}
        accent="metric-violet"
      />
      <MetricCard
        label="Most popular travel hour"
        value={formatHour(peakHour)}
        footnote={
          peakHour === undefined
            ? 'No hour data for this result'
            : `Most trips started during hour ${peakHour}`
        }
        icon={ChartNoAxesCombined}
        accent="metric-orange"
      />
    </section>
  )
}

type StationRanking = { station: string; trips: number }
type RouteRanking = { start_station: string; end_station: string; trips: number }

type RankingListProps =
  | {
      title: string
      rows: StationRanking[]
      kind: 'station'
      icon: LucideIcon
    }
  | {
      title: string
      rows: RouteRanking[]
      kind: 'route'
      icon: LucideIcon
    }

function RankingListItem({
  index,
  label,
  trips,
}: {
  index: number
  label: ReactNode
  trips: number
}) {
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 py-3 first:pt-0 last:pb-0">
      <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>
      <span className="min-w-0 break-words text-sm leading-relaxed text-ink">{label}</span>
      <span className="whitespace-nowrap font-mono text-xs text-muted">{formatCount(trips)}</span>
    </li>
  )
}

export function RankingList(props: RankingListProps) {
  const { title, icon: Icon } = props
  const rows =
    props.kind === 'station'
      ? props.rows.slice(0, 5).map((row, index) => ({
          key: `${index}-${row.station}`,
          index,
          label: row.station,
          trips: row.trips,
        }))
      : props.rows.slice(0, 5).map((row, index) => ({
          key: `${index}-${row.start_station}`,
          index,
          label: (
            <>
              {row.start_station}
              <span className="mx-1 text-primary">→</span>
              {row.end_station}
            </>
          ),
          trips: row.trips,
        }))

  return (
    <Panel title={title} icon={Icon}>
      {rows.length === 0 ? (
        <p className="py-8 text-sm text-muted">No ranking data for these filters.</p>
      ) : (
        <ol className="divide-y divide-border">
          {rows.map((row) => (
            <RankingListItem key={row.key} index={row.index} label={row.label} trips={row.trips} />
          ))}
        </ol>
      )}
    </Panel>
  )
}

function UnavailableMessage() {
  return (
    <p className="rounded-lg bg-inset p-3 text-sm text-muted">
      This field is not available in the source dataset.
    </p>
  )
}

function DemographicStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-inset p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

export function Demographics({ stats }: { stats: StatisticsData }) {
  const gender = stats.demographics.gender
  const birth = stats.demographics.birth_year
  const genderTotal = gender.counts.reduce((sum, item) => sum + item.trips, 0)
  return (
    <Panel
      title="Rider Demographics"
      subtitle="Available fields and recorded values for this city"
      icon={UsersRound}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            Gender
          </h3>
          {!gender.available ? (
            <UnavailableMessage />
          ) : genderTotal === 0 ? (
            <p className="rounded-lg bg-inset p-3 text-sm text-muted">
              No reported gender values in these trips.
            </p>
          ) : (
            <div className="space-y-3">
              {gender.counts.map((item, index) => (
                <div key={item.value}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="text-ink">{item.value}</span>
                    <span className="font-mono text-xs text-muted">
                      {formatCount(item.trips)} · {((item.trips / genderTotal) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-inset">
                    <div
                      className={`h-full rounded-full ${index === 0 ? 'bg-chart-cyan' : index === 1 ? 'bg-chart-green' : 'bg-chart-violet'}`}
                      style={{ width: `${(item.trips / genderTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">
                Missing values: {formatCount(gender.missing_count ?? 0)}
              </p>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
            Birth year
          </h3>
          {!birth.available ? (
            <UnavailableMessage />
          ) : birth.min === null || birth.min === undefined ? (
            <p className="rounded-lg bg-inset p-3 text-sm text-muted">
              No reported birth years in these trips.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-2">
              <DemographicStat label="Earliest" value={String(birth.min)} />
              <DemographicStat label="Latest" value={String(birth.max)} />
              <DemographicStat label="Most common" value={String(birth.mode)} />
              <DemographicStat
                label="Missing values"
                value={formatCount(birth.missing_count ?? 0)}
              />
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
