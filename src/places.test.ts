// Spec §8.7: `photonPlaces()` turns OpenStreetMap results (Photon, no key) into places.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { photonPlaces } from './places'

afterEach(() => vi.unstubAllGlobals())

const feature = (properties: Record<string, unknown>, lon: number, lat: number) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties })

describe('photonPlaces', () => {
  test('asks Photon for the typed text and returns named places with an address and coordinates', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [
      feature({ name: 'Café de Flore', housenumber: '172', street: 'Boulevard Saint-Germain', postcode: '75006', city: 'Paris', country: 'France', osm_type: 'N', osm_id: 42 }, 2.3326, 48.854),
      feature({ housenumber: '10', street: 'Downing Street', city: 'London', country: 'United Kingdom' }, -0.1276, 51.5034),
    ] }) })
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    const places = await photonPlaces({ lang: 'fr', limit: 3 })('café & co', { signal })
    expect(fetch).toHaveBeenCalledWith('https://photon.komoot.io/api/?q=caf%C3%A9%20%26%20co&limit=3&lang=fr', { signal })
    expect(places).toEqual([
      { name: 'Café de Flore', address: '172 Boulevard Saint-Germain, 75006, Paris, France', lat: 48.854, lon: 2.3326, provider: 'photon', id: 'N42' },
      { name: '10 Downing Street', address: 'London, United Kingdom', lat: 51.5034, lon: -0.1276, provider: 'photon', id: undefined },
    ])
  })

  test('a failed request is an error (the form says search is unavailable)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(photonPlaces()('Paris', { signal: new AbortController().signal })).rejects.toThrow('503')
  })
})
