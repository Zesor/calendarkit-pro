export const mapsUrl = (location: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

/** Only http(s), mailto, blob and relative URLs become links (no `javascript:` and the like). */
export const isSafeUrl = (url: string) => /^(https?:|mailto:|blob:|\/|\.\/|\.\.\/|[^:]*$)/i.test(url.trim());
