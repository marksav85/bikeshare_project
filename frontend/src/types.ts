export type CityId = 'chicago' | 'new_york_city' | 'washington'
export type WeekdayId =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type City = { id: CityId; name: string }
export type FilterOption<T> = { value: T; label: string }
export type FilterOptions = {
  city: CityId
  months: FilterOption<number>[]
  weekdays: FilterOption<WeekdayId>[]
  demographics: { gender: boolean; birth_year: boolean }
}

export type DurationSummary = { total: number | null; average: number | null }
export type GenderStatistics = {
  available: boolean
  counts: { value: string; trips: number }[]
  missing_count: number | null
}
export type BirthYearStatistics = GenderStatistics & {
  min?: number | null
  max?: number | null
  mode?: number | null
}

export type Statistics = {
  city: CityId
  filters: { month: number | null; weekday: WeekdayId | null }
  trip_count: number
  duration_seconds: DurationSummary
  popular_travel_times: {
    month: { month: string; trips: number }[]
    weekday: { weekday: string; trips: number }[]
    hour: { hour: number; trips: number }[]
  }
  distributions: {
    months: { month: string; trips: number }[]
    weekdays: { weekday: string; trips: number }[]
    hours: { hour: number; trips: number }[]
  }
  popular_stations: {
    start: { station: string; trips: number }[]
    end: { station: string; trips: number }[]
  }
  popular_routes: { start_station: string; end_station: string; trips: number }[]
  rider_types: { type: string; trips: number }[]
  demographics: { gender: GenderStatistics; birth_year: BirthYearStatistics }
}

export type FilterSelection = {
  city: CityId
  month: number | null
  weekday: WeekdayId | null
}
