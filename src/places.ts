import type { Place, PlaceSearch } from './types';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; housenumber?: string; street?: string; postcode?: string; city?: string; country?: string; osm_type?: string; osm_id?: number };
}

/**
 * Place search on OpenStreetMap data through Photon (photon.komoot.io, no key; spec §8.7). Pass it
 * as `placeSearch`: what is typed in the Location field is sent there. `lang`: en, de, fr or it.
 */
export function photonPlaces({ lang, limit = 5, endpoint = 'https://photon.komoot.io/api/' }: { lang?: string; limit?: number; endpoint?: string } = {}): PlaceSearch {
  return async (query, { signal }) => {
    const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&limit=${limit}${lang ? `&lang=${lang}` : ''}`, { signal });
    if (!response.ok) throw new Error(`Photon answered ${response.status}`);
    const { features } = (await response.json()) as { features: PhotonFeature[] };
    return features.map(({ geometry, properties: p }): Place => {
      const street = [p.housenumber, p.street].filter(Boolean).join(' ');
      return {
        name: p.name || street || p.city || '',
        address: [p.name ? street : '', p.postcode, p.city, p.country].filter(Boolean).join(', ') || undefined,
        lat: geometry.coordinates[1],
        lon: geometry.coordinates[0],
        provider: 'photon',
        id: p.osm_type && p.osm_id !== undefined ? `${p.osm_type}${p.osm_id}` : undefined,
      };
    });
  };
}
