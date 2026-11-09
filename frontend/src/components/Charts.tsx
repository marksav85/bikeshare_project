import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Bike, CalendarDays, Clock3 } from 'lucide-react'
import { Panel } from './Panel'
import type { Statistics } from '../types'

// Palette used to distinguish rider categories in the pie chart and legend.
const RIDER_COLORS = [
  'var(--chart-cyan)',
  'var(--chart-green)',
  'var(--chart-violet)',
  'var(--chart-orange)',
]

// Shared chart labels and tooltip presentation.
function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatHour(hour: number | undefined): string {
  if (hour === undefined) return '—'
  const start = new Date(2000, 0, 1, hour)
  const end = new Date(2000, 0, 1, hour + 1)
  const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric' })
  return `${formatter.format(start)}–${formatter.format(end)}`
}

function toTitle(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value?: number; name?: string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip rounded-lg border px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-muted">
        {typeof label === 'number' ? formatHour(label) : label}
      </p>
      {payload.map((item) => (
        <p key={item.name} className="font-mono text-sm font-semibold text-ink">
          {formatCount(Number(item.value ?? 0))} trips
        </p>
      ))}
    </div>
  )
}

// Trips grouped across all 24 start-time hours.
export function HourlyChart({ stats }: { stats: Statistics }) {
  const hourlyCounts = new Map(stats.distributions.hours.map((item) => [item.hour, item.trips]))
  const data = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    trips: hourlyCounts.get(hour) ?? 0,
  }))
  return (
    <Panel
      title="Trips by Hour of Day"
      subtitle="Trip start volume across the 24-hour day"
      icon={Clock3}
    >
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Bar chart showing trip counts by hour of day"
        aria-describedby="hourly-chart-description"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
            <XAxis
              dataKey="hour"
              tickFormatter={(hour: number) =>
                hour % 3 === 0 ? String(hour).padStart(2, '0') : ''
              }
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-hover)' }} />
            <Bar
              dataKey="trips"
              name="Trips"
              fill="var(--chart-cyan)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p id="hourly-chart-description" className="sr-only">
        {data
          .map((item) => `${formatHour(item.hour)}: ${formatCount(item.trips)} trips`)
          .join('. ')}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-inset px-3 py-2 text-xs text-muted">
        <span>All 24 hours shown · based on trip start time</span>
        <span className="font-mono text-primary">
          Peak{' '}
          {stats.popular_travel_times.hour[0]
            ? formatHour(stats.popular_travel_times.hour[0].hour)
            : '—'}
        </span>
      </div>
    </Panel>
  )
}

// Weekday distribution, including days with zero trips.
export function WeekdayChart({ stats }: { stats: Statistics }) {
  return (
    <Panel
      title="Trips by Weekday"
      subtitle="Trip frequency from Monday through Sunday"
      icon={CalendarDays}
    >
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Bar chart showing trip counts for every weekday"
        aria-describedby="weekday-chart-description"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={stats.distributions.weekdays}
            margin={{ top: 10, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" />
            <XAxis
              dataKey="weekday"
              tickFormatter={(day: string) => day.slice(0, 3)}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-hover)' }} />
            <Bar
              dataKey="trips"
              name="Trips"
              fill="var(--chart-green)"
              radius={[4, 4, 0, 0]}
              maxBarSize={42}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p id="weekday-chart-description" className="sr-only">
        {stats.distributions.weekdays
          .map((item) => `${item.weekday}: ${formatCount(item.trips)} trips`)
          .join('. ')}
      </p>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-inset px-3 py-2 text-xs text-muted">
        <span>Seven days · zero-count days retained</span>
        <span className="font-mono text-primary">
          Busiest {stats.popular_travel_times.weekday[0]?.weekday ?? '—'}
        </span>
      </div>
    </Panel>
  )
}

// Rider-type distribution and matching category legend.
export function RiderChart({ stats }: { stats: Statistics }) {
  const total = stats.rider_types.reduce((sum, item) => sum + item.trips, 0)
  const data = stats.rider_types.map((item) => ({ ...item, name: toTitle(item.type) }))
  return (
    <Panel
      title="Rider Types"
      subtitle="Reported user categories in the selected trips"
      icon={Bike}
    >
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          No rider-type values are available for this result.
        </p>
      ) : (
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(140px,0.8fr)_1fr]">
          <div
            className="mx-auto h-52 w-full max-w-56"
            role="img"
            aria-label="Donut chart showing rider-type trip counts"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="trips"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={2}
                >
                  {data.map((item, index) => (
                    <Cell
                      key={item.type}
                      fill={RIDER_COLORS[index % RIDER_COLORS.length]}
                      stroke="var(--surface)"
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  wrapperStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3">
            {data.map((item, index) => (
              <li
                key={item.type}
                className="flex items-center justify-between gap-3 rounded-lg bg-inset px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: RIDER_COLORS[index % RIDER_COLORS.length] }}
                  />
                  <span className="break-words">{item.name}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs text-muted">
                  {formatCount(item.trips)} ·{' '}
                  {total ? `${((item.trips / total) * 100).toFixed(1)}%` : '0%'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}
