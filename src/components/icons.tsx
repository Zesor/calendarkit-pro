/*! Icon shapes from Lucide (https://lucide.dev), ISC License.
Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. */
import React from 'react'

type Shape = [tag: 'path' | 'circle' | 'rect' | 'line' | 'polyline', attributes: Record<string, string | number>]

// Stroke icons, decorative: the button or the text next to them carries the accessible name.
function icon(name: string, shapes: Shape[]) {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {shapes.map(([Tag, attributes], i) => (
        <Tag key={i} {...attributes} />
      ))}
    </svg>
  )
  Icon.displayName = name
  return Icon
}

export const AlignLeft = icon('AlignLeft', [['path', { d: 'M15 12H3' }], ['path', { d: 'M17 18H3' }], ['path', { d: 'M21 6H3' }]])
export const Bell = icon('Bell', [['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }], ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }]])
export const BellRing = icon('BellRing', [['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }], ['path', { d: 'M22 8c0-2.3-.8-4.3-2-6' }], ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }], ['path', { d: 'M4 2C2.8 3.7 2 5.7 2 8' }]])
export const Calendar = icon('Calendar', [['path', { d: 'M8 2v4' }], ['path', { d: 'M16 2v4' }], ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }], ['path', { d: 'M3 10h18' }]])
export const CalendarDays = icon('CalendarDays', [['path', { d: 'M8 2v4' }], ['path', { d: 'M16 2v4' }], ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }], ['path', { d: 'M3 10h18' }], ['path', { d: 'M8 14h.01' }], ['path', { d: 'M12 14h.01' }], ['path', { d: 'M16 14h.01' }], ['path', { d: 'M8 18h.01' }], ['path', { d: 'M12 18h.01' }], ['path', { d: 'M16 18h.01' }]])
export const CalendarRange = icon('CalendarRange', [['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }], ['path', { d: 'M16 2v4' }], ['path', { d: 'M3 10h18' }], ['path', { d: 'M8 2v4' }], ['path', { d: 'M17 14h-6' }], ['path', { d: 'M13 18H7' }], ['path', { d: 'M7 14h.01' }], ['path', { d: 'M17 18h.01' }]])
export const Check = icon('Check', [['path', { d: 'M20 6 9 17l-5-5' }]])
export const ChevronDown = icon('ChevronDown', [['path', { d: 'm6 9 6 6 6-6' }]])
export const ChevronLeft = icon('ChevronLeft', [['path', { d: 'm15 18-6-6 6-6' }]])
export const ChevronRight = icon('ChevronRight', [['path', { d: 'm9 18 6-6-6-6' }]])
export const Clock = icon('Clock', [['circle', { cx: '12', cy: '12', r: '10' }], ['polyline', { points: '12 6 12 12 16 14' }]])
export const Copy = icon('Copy', [['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }], ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }]])
export const Edit2 = icon('Edit2', [['path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }]])
export const Edit3 = icon('Edit3', [['path', { d: 'M12 20h9' }], ['path', { d: 'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z' }]])
export const Globe = icon('Globe', [['circle', { cx: '12', cy: '12', r: '10' }], ['path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }], ['path', { d: 'M2 12h20' }]])
export const ListTodo = icon('ListTodo', [['rect', { x: '3', y: '5', width: '6', height: '6', rx: '1' }], ['path', { d: 'm3 17 2 2 4-4' }], ['path', { d: 'M13 6h8' }], ['path', { d: 'M13 12h8' }], ['path', { d: 'M13 18h8' }]])
export const MapPin = icon('MapPin', [['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }], ['circle', { cx: '12', cy: '10', r: '3' }]])
export const Menu = icon('Menu', [['line', { x1: '4', x2: '20', y1: '12', y2: '12' }], ['line', { x1: '4', x2: '20', y1: '6', y2: '6' }], ['line', { x1: '4', x2: '20', y1: '18', y2: '18' }]])
export const Moon = icon('Moon', [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]])
export const Paperclip = icon('Paperclip', [['path', { d: 'M13.234 20.252 21 12.3' }], ['path', { d: 'm16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486' }]])
export const Plus = icon('Plus', [['path', { d: 'M5 12h14' }], ['path', { d: 'M12 5v14' }]])
export const Repeat = icon('Repeat', [['path', { d: 'm17 2 4 4-4 4' }], ['path', { d: 'M3 11v-1a4 4 0 0 1 4-4h14' }], ['path', { d: 'm7 22-4-4 4-4' }], ['path', { d: 'M21 13v1a4 4 0 0 1-4 4H3' }]])
export const Sun = icon('Sun', [['circle', { cx: '12', cy: '12', r: '4' }], ['path', { d: 'M12 2v2' }], ['path', { d: 'M12 20v2' }], ['path', { d: 'm4.93 4.93 1.41 1.41' }], ['path', { d: 'm17.66 17.66 1.41 1.41' }], ['path', { d: 'M2 12h2' }], ['path', { d: 'M20 12h2' }], ['path', { d: 'm6.34 17.66-1.41 1.41' }], ['path', { d: 'm19.07 4.93-1.41 1.41' }]])
export const Tag = icon('Tag', [['path', { d: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' }], ['circle', { cx: '7.5', cy: '7.5', r: '.5', fill: 'currentColor' }]])
export const Trash2 = icon('Trash2', [['path', { d: 'M3 6h18' }], ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }], ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }], ['line', { x1: '10', x2: '10', y1: '11', y2: '17' }], ['line', { x1: '14', x2: '14', y1: '11', y2: '17' }]])
export const Users = icon('Users', [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: '9', cy: '7', r: '4' }], ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]])
export const X = icon('X', [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]])
