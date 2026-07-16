"use client";

import { addDays, addHours, format, isBefore, parse, setHours, startOfDay } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import { getNowInWIB } from "@/lib/timezone";

import "react-day-picker/style.css";

const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  label?: string;
};

function parseInput(value: string) {
  if (!value) return undefined;
  const parsed = parse(value, INPUT_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function inputValue(date: Date, hour: number, minute: number) {
  return format(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute), INPUT_FORMAT);
}

function displayValue(date: Date, hour: number, minute: number) {
  return `${format(date, "EEEE, dd MMM yyyy", { locale: id })} - ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} WIB`;
}

export function DateTimePicker({ value, onChange, required, disabled, id = "publish-date-time", label = "Publish date & time (WIB)" }: Props) {
  const parsed = parseInput(value);
  const now = useMemo(() => getNowInWIB(), []);
  const today = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(parsed);
  const [hour, setHour] = useState(parsed?.getHours() ?? 9);
  const [minute, setMinute] = useState(parsed?.getMinutes() ?? 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function chooseDay(day: Date | undefined) {
    if (!day || isBefore(startOfDay(day), startOfDay(today))) return;
    setSelectedDay(day);
    onChange(inputValue(day, hour, minute));
  }

  function updateTime(nextHour: number, nextMinute: number) {
    setHour(nextHour);
    setMinute(nextMinute);
    if (selectedDay) onChange(inputValue(selectedDay, nextHour, nextMinute));
  }

  function applyShortcut(date: Date) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDay(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    const nextHour = date.getHours();
    const nextMinute = date.getMinutes();
    setHour(nextHour);
    setMinute(nextMinute);
    onChange(inputValue(next, nextHour, nextMinute));
  }

  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = [0, 15, 30, 45];

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-700 dark:focus:ring-violet-950"
      >
        <CalendarDays size={18} className="shrink-0 text-[#F97362]" />
        <span className={selectedDay ? "" : "text-slate-500 dark:text-slate-400"}>
          {selectedDay ? displayValue(selectedDay, hour, minute) : "Pilih tanggal & waktu publish"}
        </span>
      </button>

      {open ? (
        <div role="dialog" aria-label="Pilih tanggal dan waktu publish" className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-[calc(100%+0.5rem)] sm:top-auto sm:w-[22rem] dark:border-slate-700 dark:bg-slate-900">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDay}
            onSelect={chooseDay}
            disabled={{ before: today }}
            showOutsideDays
            weekStartsOn={1}
            classNames={{
              months: "w-full",
              month: "w-full space-y-3",
              month_caption: "flex items-center justify-between",
              caption_label: "text-sm font-black text-slate-900 dark:text-white",
              nav: "flex items-center gap-1",
              button_previous: "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:text-slate-300",
              button_next: "inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:text-slate-300",
              month_grid: "w-full border-collapse",
              weekdays: "grid grid-cols-7",
              weekday: "py-2 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400",
              week: "grid grid-cols-7",
              day: "flex items-center justify-center p-0.5",
              day_button: "h-9 w-9 rounded-xl text-sm transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:hover:bg-violet-950",
              selected: "bg-gradient-to-br from-[#F97362] to-[#7C3AED] font-black text-white hover:from-[#F97362] hover:to-[#7C3AED]",
              today: "ring-2 ring-[#F97362] ring-offset-1 ring-offset-white dark:ring-offset-slate-900",
              outside: "text-slate-300 dark:text-slate-600",
              disabled: "cursor-not-allowed text-slate-300 opacity-60 dark:text-slate-600",
            }}
            modifiersClassNames={{
              weekend: "bg-slate-100/70 dark:bg-slate-800/70",
            }}
            modifiers={{ weekend: (date) => date.getDay() === 0 || date.getDay() === 6 }}
            components={{
              Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
            }}
          />

          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <Clock3 size={14} className="text-violet-500" /> Waktu publish <span className="text-[#F97362]">WIB</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Jam" value={hour} onChange={(event) => updateTime(Number(event.target.value), minute)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-violet-950">
                {hours.map((item) => <option key={item} value={item}>{String(item).padStart(2, "0")}</option>)}
              </select>
              <select aria-label="Menit" value={minute} onChange={(event) => updateTime(hour, Number(event.target.value))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-violet-950">
                {minutes.map((item) => <option key={item} value={item}>{String(item).padStart(2, "0")}</option>)}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyShortcut(addHours(now, 1))} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-violet-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-violet-950">Sekarang +1 jam</button>
              <button type="button" onClick={() => applyShortcut(setHours(addDays(today, 1), 9))} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-violet-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-violet-950">Besok 09:00</button>
              <button type="button" onClick={() => applyShortcut(setHours(addDays(today, now.getHours() >= 17 ? 1 : 0), 17))} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-violet-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-violet-950">Sore ini 17:00</button>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"><Check size={16} /> Selesai</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
