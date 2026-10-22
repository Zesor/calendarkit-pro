import type { Place } from '../types';

const point = (place: Place) => encodeURIComponent(`${place.lat},${place.lon}`);

export const mapsUrl = (target: string | Place) => `https://www.google.com/maps/search/?api=1&query=${typeof target === 'string' ? encodeURIComponent(target) : point(target)}`;
export const directionsUrl = (place: Place) => `https://www.google.com/maps/dir/?api=1&destination=${point(place)}`;

/** Only http(s), mailto, blob and relative URLs become links (no `javascript:` and the like). */
export const isSafeUrl = (url: string) => /^(https?:|mailto:|blob:|\/|\.\/|\.\.\/|[^:]*$)/i.test(url.trim());
