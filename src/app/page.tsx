"use client";

import { useState, useMemo, useEffect } from "react";
import { Scheduler, CalendarEvent, ViewType, Resource, EventType, ThemePreset, CalendarLayout, photonPlaces } from "@/index";

interface Calendar {
  id: string;
  label: string;
  color: string;
  active: boolean;
}
import { addDays, startOfWeek, addHours } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// Generate demo events
const generateDemoEvents = (): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  const today = new Date();
  const weekStart = startOfWeek(today);

  const createEvent = (
    id: string,
    title: string,
    dayOffset: number,
    hourStart: number,
    duration: number,
    calendarId: string,
    color: string,
    resourceId?: string,
    recurrence?: CalendarEvent["recurrence"]
  ): CalendarEvent => {
    const start = addHours(addDays(weekStart, dayOffset), hourStart);
    const end = addHours(start, duration);
    return { id, title, start, end, calendarId, color, resourceId, recurrence };
  };

  // Monday
  events.push(createEvent("1", "Team Standup", 1, 9, 0.5, "work", "#3b82f6", "room-a"));
  events.push(createEvent("2", "Project Review", 1, 10, 2, "work", "#3b82f6", "room-b"));
  events.push(createEvent("3", "Lunch Meeting", 1, 12, 1, "personal", "#10b981"));

  // Tuesday
  events.push(createEvent("4", "Client Call", 2, 9, 1, "work", "#3b82f6", "room-a"));
  events.push(createEvent("5", "Code Review", 2, 14, 1.5, "work", "#3b82f6"));

  // Wednesday - with recurrence
  events.push(createEvent("6", "Workshop", 3, 10, 3, "work", "#3b82f6", "room-c"));
  events.push(createEvent("7", "Gym", 3, 17, 1, "personal", "#10b981", undefined, {
    freq: "WEEKLY",
    interval: 1
  }));

  // Thursday
  events.push(createEvent("8", "Sprint Planning", 4, 9, 2, "work", "#3b82f6", "room-b"));
  events.push(createEvent("9", "1:1 Meeting", 4, 14, 0.5, "work", "#3b82f6", "room-a"));

  // Friday
  events.push(createEvent("10", "Demo Day", 5, 14, 2, "work", "#3b82f6", "room-c"));
  events.push(createEvent("11", "Happy Hour", 5, 17, 2, "personal", "#10b981"));

  // All-day and multi-day events (1.4.0). All-day ends are exclusive: midnight after the last day.
  const allDay = (id: string, title: string, firstDayOffset: number, days: number, calendarId: string, color: string, recurrence?: CalendarEvent["recurrence"]): CalendarEvent => ({
    id, title, calendarId, color, recurrence, allDay: true,
    start: addDays(weekStart, firstDayOffset),
    end: addDays(weekStart, firstDayOffset + days),
  });
  events.push(allDay("12", "Tech Conference", 1, 3, "work", "#8b5cf6"));
  events.push(allDay("13", "Vacation", 4, 10, "personal", "#f97316"));
  events.push(allDay("14", "Company Offsite", 3, 1, "work", "#ec4899"));
  events.push(allDay("15", "Release Freeze", 3, 1, "work", "#64748b"));
  events.push(allDay("16", "Team Birthday", 2, 1, "personal", "#10b981", { freq: "YEARLY" }));
  // A 30 h trip (timed, ≥ 24 h → shown in the all-day row)
  events.push(createEvent("17", "Flight to Tokyo", 3, 20, 30, "personal", "#0ea5e9"));

  // The weeks before, so the month view has a past.
  const past: [string, number, number, number, string, string][] = [
    ["Planning", 1, 9, 1, "work", "#3b82f6"], ["Design Sync", 2, 11, 1, "work", "#3b82f6"], ["Yoga", 3, 18, 1, "personal", "#10b981"],
    ["Retro", 4, 15, 1, "work", "#3b82f6"], ["Dinner with Sam", 5, 19, 2, "personal", "#10b981"],
  ];
  for (const week of [-3, -2, -1]) {
    past.forEach(([title, day, hour, duration, calendarId, color], i) => {
      if ((i + week) % 3 !== 0) events.push(createEvent(`p${week}-${i}`, title, week * 7 + day, hour, duration, calendarId, color));
    });
  }
  events.push(allDay("18", "Hackathon", -12, 2, "work", "#8b5cf6"));

  return events;
};

// Demo resources
const demoResources: Resource[] = [
  { id: "room-a", label: "Conference Room A", color: "#3b82f6" },
  { id: "room-b", label: "Conference Room B", color: "#10b981" },
  { id: "room-c", label: "Meeting Room C", color: "#f59e0b" },
];

// Demo event types
const demoEventTypes: EventType[] = [
  { id: "meeting", label: "Meeting", color: "#3b82f6" },
  { id: "focus", label: "Focus Time", color: "#8b5cf6" },
  { id: "personal", label: "Personal", color: "#10b981" },
];

// Translations
const translations = {
  en: {
    today: "Today",
    month: "Month",
    week: "Week",
    day: "Day",
    agenda: "Agenda",
    resource: "Resource",
    createEvent: "Create Event",
    editEvent: "Edit Event",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    title: "Title",
    start: "Start",
    end: "End",
    allDay: "All Day",
    description: "Description",
    repeat: "Repeat",
    noRepeat: "Does not repeat",
    selectCalendar: "Select Calendar",
    selectType: "Select Type",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  },
  fr: {
    today: "Aujourd'hui",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    resource: "Ressource",
    createEvent: "Créer un événement",
    editEvent: "Modifier l'événement",
    delete: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    title: "Titre",
    start: "Début",
    end: "Fin",
    allDay: "Toute la journée",
    description: "Description",
    repeat: "Répéter",
    noRepeat: "Ne se répète pas",
    selectCalendar: "Sélectionner un calendrier",
    selectType: "Sélectionner un type",
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    yearly: "Annuel",
  },
};

export default function Home() {
  const [events, setEvents] = useState<CalendarEvent[]>(generateDemoEvents());
  const [view, setView] = useState<ViewType>("week");
  const [date, setDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [theme, setTheme] = useState<ThemePreset>("calm");
  const [layout, setLayout] = useState<CalendarLayout>("classic");
  const [reverseTimeAxis, setReverseTimeAxis] = useState(false);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  // The demo turns place search on (OpenStreetMap through Photon); a host opts in the same way.
  const placeSearch = useMemo(() => photonPlaces({ lang: language }), [language]);
  const [timezone, setTimezone] = useState("America/New_York");

  const [scrollToHour, setScrollToHour] = useState<number>();

  // Demo settings from the URL (?layout=focus&theme=editorial&dark=1&view=month&tz=local&hour=8&day=2),
  // used for the README screenshots.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("layout")) setLayout(q.get("layout") as CalendarLayout);
    if (q.get("theme")) setTheme(q.get("theme") as ThemePreset);
    if (q.get("view")) setView(q.get("view") as ViewType);
    if (q.get("dark")) setIsDarkMode(true);
    if (q.get("lang") === "fr") setLanguage("fr");
    if (q.get("tz")) setTimezone(q.get("tz") === "local" ? Intl.DateTimeFormat().resolvedOptions().timeZone : q.get("tz")!);
    if (q.get("hour")) setScrollToHour(Number(q.get("hour")));
    if (q.get("day")) setDate(addDays(startOfWeek(new Date()), Number(q.get("day"))));
  }, []);

  const [calendars, setCalendars] = useState<Calendar[]>([
    { id: "work", label: "Work", color: "#3b82f6", active: true },
    { id: "personal", label: "Personal", color: "#10b981", active: true },
  ]);

  const filteredEvents = useMemo(() => {
    const activeIds = calendars.filter((c) => c.active).map((c) => c.id);
    return events.filter((e) => !e.calendarId || activeIds.includes(e.calendarId));
  }, [events, calendars]);

  const handleEventCreate = (newEvent: Partial<CalendarEvent>) => {
    const event: CalendarEvent = {
      ...newEvent,
      id: Math.random().toString(36).substr(2, 9),
      start: newEvent.start as Date,
      end: newEvent.end as Date,
      title: newEvent.title || "New Event",
      color: calendars.find((c) => c.id === newEvent.calendarId)?.color || "#3b82f6",
    };
    setEvents((prev) => [...prev, event]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
  };

  const handleEventDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  return (
    <main className={`demo${isDarkMode ? " dark" : ""}`}>
      <div className="demo-inner">
        <div className="demo-header">
          <h1>ProScheduler</h1>
          <p>
            Professional React calendar with drag-drop, timezone support, i18n, resources, and recurring events.
          </p>
          <label className="demo-theme">
            Theme{" "}
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemePreset)}>
              <option value="calm">Calm</option>
              <option value="vivid">Vivid</option>
              <option value="editorial">Editorial</option>
            </select>
          </label>{" "}
          <label className="demo-theme">
            Layout{" "}
            <select value={layout} onChange={(e) => setLayout(e.target.value as CalendarLayout)}>
              <option value="classic">Classic</option>
              <option value="focus">Focus</option>
              <option value="flow">Flow</option>
            </select>
          </label>{" "}
          <label className="demo-theme">
            <input type="checkbox" checked={reverseTimeAxis} onChange={(e) => setReverseTimeAxis(e.target.checked)} /> Latest hours on top
          </label>
        </div>

        <div className="demo-frame">
          <Scheduler
            layout={layout}
            events={filteredEvents}
            view={view}
            onViewChange={setView}
            date={date}
            onDateChange={setDate}
            calendars={calendars}
            onCalendarToggle={(id, active) => {
              setCalendars((cals) =>
                cals.map((c) => (c.id === id ? { ...c, active } : c))
              );
            }}
            onEventCreate={handleEventCreate}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            placeSearch={placeSearch}
            resources={demoResources}
            eventTypes={demoEventTypes}
            theme={theme}
            isDarkMode={isDarkMode}
            onThemeToggle={() => setIsDarkMode(!isDarkMode)}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            language={language}
            onLanguageChange={(lang) => setLanguage(lang as "en" | "fr")}
            translations={translations[language]}
            locale={language === "fr" ? fr : enUS}
            workingHours={{ start: 9, end: 18 }}
            reverseTimeAxis={reverseTimeAxis}
            scrollToHour={scrollToHour}
          />
        </div>
      </div>
    </main>
  );
}
