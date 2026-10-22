import React, { useEffect, useRef, useState } from 'react';
import type { CalendarTranslations, Place, PlaceSearch } from '../types';
import { cx } from '../utils';
import { MapPin, Navigation, X } from './icons';
import { directionsUrl, mapsUrl } from './links';

const DELAY = 300;
const MIN_LENGTH = 3;
const isLink = (text: string) => /^https?:\/\//i.test(text.trim());
const placeLabel = (place: Place) => (place.address ? `${place.name}, ${place.address}` : place.name);

interface PlaceFieldProps {
  id: string;
  value: string;
  place?: Place;
  search?: PlaceSearch;
  className: string;
  translations: CalendarTranslations;
  onChange: (location: string, place?: Place) => void;
}

type Status = 'idle' | 'searching' | 'done' | 'error';

/**
 * The form's Location field (spec §8.7). With `search`, an accessible combobox that suggests places
 * as you type (a video link is kept as typed); a chosen place shows a card with Maps and directions.
 */
export const PlaceField: React.FC<PlaceFieldProps> = ({ id, value, place, search, className, translations: t, onChange }) => {
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const typed = useRef('');

  useEffect(() => {
    const query = typed.current.trim();
    if (!search || !open || query.length < MIN_LENGTH || isLink(query)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus('searching');
      search(query, { signal: controller.signal }).then(
        (found) => {
          // The same place twice (a provider's duplicates) is listed once.
          const seen = new Set<string>();
          setResults(found.filter((p) => !seen.has(placeLabel(p)) && seen.add(placeLabel(p))));
          setActive(-1);
          setStatus('done');
        },
        () => !controller.signal.aborted && setStatus('error'),
      );
    }, DELAY);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, open, value]);

  const choose = (chosen: Place) => {
    onChange(placeLabel(chosen), chosen);
    setOpen(false);
  };

  if (!search) {
    return <input id={id} type="text" className={cx(className, 'ck:w-full')} placeholder={t.addLocation} value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  const listId = `${id}-places`;
  const showList = open && status !== 'idle' && typed.current.trim().length >= MIN_LENGTH && !isLink(typed.current);
  return (
    <div>
      <div className="ck:relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className={cx(className, 'ck:w-full')}
          placeholder={t.addLocation}
          value={value}
          onChange={(e) => {
            typed.current = e.target.value;
            setOpen(true);
            if (e.target.value.trim().length < MIN_LENGTH) setStatus('idle');
            onChange(e.target.value);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            // The combobox's own keys (ARIA pattern), not shortcuts: move in the list, choose, close it.
            if (!showList) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              const step = e.key === 'ArrowDown' ? 1 : -1;
              setActive((i) => (results.length ? (i + step + results.length) % results.length : -1));
            } else if (e.key === 'Enter' && active >= 0 && results[active]) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === 'Escape') {
              // Closes the list only, not the form.
              e.nativeEvent.stopPropagation();
              setOpen(false);
            }
          }}
        />
        {showList && (
          <div className="ck:absolute ck:left-0 ck:right-0 ck:top-full ck:z-10 ck:mt-1 ck:rounded-xl ck:border ck:border-border ck:bg-background ck:p-1 ck:shadow-xl">
            {status === 'searching' && <p role="status" className="ck:px-3 ck:py-2 ck:text-sm ck:text-muted-foreground">{t.placeSearching}</p>}
            {status === 'error' && <p role="status" className="ck:px-3 ck:py-2 ck:text-sm ck:text-muted-foreground">{t.placeUnavailable}</p>}
            {status === 'done' && results.length === 0 && <p role="status" className="ck:px-3 ck:py-2 ck:text-sm ck:text-muted-foreground">{t.placeNone}</p>}
            <ul id={listId} role="listbox" aria-label={t.placesLabel} hidden={status !== 'done' || results.length === 0}>
              {results.map((result, i) => (
                <li
                  key={placeLabel(result)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={cx("ck:flex ck:cursor-pointer ck:items-start ck:gap-2.5 ck:rounded-lg ck:px-3 ck:py-2 ck:text-sm", i === active ? "ck:bg-muted" : "ck:hover:bg-muted")}
                  // Before the input's blur closes the list.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(result)}
                >
                  <MapPin className="ck:mt-0.5 ck:h-4 ck:w-4 ck:shrink-0 ck:text-muted-foreground" aria-hidden="true" />
                  <span className="ck:min-w-0">
                    <span className="ck:block ck:font-medium ck:text-foreground">{result.name}</span>
                    {result.address && <span className="ck:block ck:truncate ck:text-xs ck:text-muted-foreground">{result.address}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {place && (
        <div className="ck:mt-2 ck:flex ck:items-center ck:gap-3 ck:rounded-xl ck:bg-muted ck:p-2.5">
          {/* A drawn map tile (no map provider): a pin over two roads. */}
          <span aria-hidden="true" className="ck:h-12 ck:w-12 ck:shrink-0 ck:rounded-lg ck:bg-[radial-gradient(circle_at_50%_45%,var(--ck-ring)_0_5px,transparent_6px),linear-gradient(35deg,transparent_46%,color-mix(in_srgb,var(--ck-muted-foreground)_30%,transparent)_47%_53%,transparent_54%),linear-gradient(120deg,transparent_30%,color-mix(in_srgb,var(--ck-muted-foreground)_22%,transparent)_31%_36%,transparent_37%)] ck:bg-background" />
          <div className="ck:min-w-0 ck:flex-1">
            {place.address && <p className="ck:truncate ck:text-xs ck:text-muted-foreground">{place.address}</p>}
            <div className="ck:flex ck:flex-wrap ck:gap-x-4">
              <a href={mapsUrl(place)} target="_blank" rel="noopener noreferrer" className="ck:inline-flex ck:min-h-8 ck:items-center ck:gap-1.5 ck:text-sm ck:font-semibold ck:text-foreground ck:underline ck:decoration-border ck:underline-offset-4 ck:hover:decoration-foreground">
                <MapPin className="ck:h-3.5 ck:w-3.5" aria-hidden="true" />{t.openInMaps}
              </a>
              <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" className="ck:inline-flex ck:min-h-8 ck:items-center ck:gap-1.5 ck:text-sm ck:font-semibold ck:text-foreground ck:underline ck:decoration-border ck:underline-offset-4 ck:hover:decoration-foreground">
                <Navigation className="ck:h-3.5 ck:w-3.5" aria-hidden="true" />{t.directions}
              </a>
            </div>
          </div>
          <button type="button" onClick={() => onChange('', undefined)} aria-label={t.removePlace} className="ck:flex ck:h-8 ck:w-8 ck:shrink-0 ck:items-center ck:justify-center ck:rounded-lg ck:text-muted-foreground ck:hover:bg-background ck:hover:text-foreground">
            <X className="ck:h-4 ck:w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
