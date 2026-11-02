import type {
  City,
  CityId,
  FilterOptions,
  FilterSelection,
  Statistics,
} from './types'

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, headers: { Accept: 'application/json' } })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? (body as { detail: unknown }).detail
        : null
    if (typeof detail === 'string') throw new Error(detail)
    if (response.status === 422) {
      throw new Error('Choose a supported city, month, and weekday.')
    }
    throw new Error('The BikeShare service could not complete the request.')
  }
  return body as T
}

export function fetchCities(signal?: AbortSignal): Promise<{ cities: City[] }> {
  return getJson('/api/cities', signal)
}

export function fetchFilters(
  city: CityId,
  signal?: AbortSignal,
): Promise<FilterOptions> {
  return getJson(`/api/filters?city=${encodeURIComponent(city)}`, signal)
}

export function fetchStatistics(
  selection: FilterSelection,
  signal?: AbortSignal,
): Promise<Statistics> {
  const query = new URLSearchParams({ city: selection.city })
  if (selection.month !== null) query.set('month', String(selection.month))
  if (selection.weekday !== null) query.set('weekday', selection.weekday)
  return getJson(`/api/statistics?${query.toString()}`, signal)
}
