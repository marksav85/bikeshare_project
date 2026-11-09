import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCities, fetchFilters, fetchStatistics } from './api'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BikeShare API client', () => {
  it('fetches and returns the city list as JSON', async () => {
    const body = { cities: [{ id: 'chicago', name: 'Chicago' }] }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(body))

    await expect(fetchCities()).resolves.toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith('/api/cities', {
      signal: undefined,
      headers: { Accept: 'application/json' },
    })
  })

  it('requests filter options for the selected city', async () => {
    const body = {
      city: 'new_york_city',
      months: [],
      weekdays: [],
      demographics: { gender: true, birth_year: true },
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(body))

    await expect(fetchFilters('new_york_city')).resolves.toEqual(body)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/filters?city=new_york_city')
  })

  it('omits unset month and weekday statistics filters', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ trip_count: 0 }))

    await fetchStatistics({ city: 'washington', month: null, weekday: null })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/statistics?city=washington')
  })

  it('includes the selected month and weekday in statistics requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ trip_count: 0 }))

    await fetchStatistics({ city: 'chicago', month: 6, weekday: 'monday' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/statistics?city=chicago&month=6&weekday=monday')
  })

  it('uses a string detail from a non-success response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ detail: 'Data is temporarily unavailable.' }, 503),
    )

    await expect(fetchCities()).rejects.toThrow('Data is temporarily unavailable.')
  })

  it('maps FastAPI validation errors to the supported-filter message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ detail: [{ msg: 'Input should be greater than or equal to 1' }] }, 422),
    )

    await expect(fetchCities()).rejects.toThrow('Choose a supported city, month, and weekday.')
  })

  it('uses the generic service message when an error response is not valid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not JSON', { status: 503 }))

    await expect(fetchCities()).rejects.toThrow(
      'The BikeShare service could not complete the request.',
    )
  })

  it('propagates network failures from fetch', async () => {
    const networkError = new TypeError('Network request failed')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(networkError)

    await expect(fetchCities()).rejects.toBe(networkError)
  })

  it('passes abort signals through and propagates request cancellation', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('The request was aborted.', 'AbortError')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abortError), { once: true })
        }),
    )

    const request = fetchCities(controller.signal)
    controller.abort()

    await expect(request).rejects.toBe(abortError)
    expect(fetchMock).toHaveBeenCalledWith('/api/cities', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  })
})
