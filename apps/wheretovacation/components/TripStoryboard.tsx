'use client'

import { Calendar, MapPin, SunMedium } from 'lucide-react'
import type { PropertyCardRental } from '@/components/PropertyCard'

interface StoryboardDay {
  id: string
  label: string
  title: string
  subtitle?: string
  heroImage?: string
  rentals?: PropertyCardRental[]
  notes?: string
}

interface TripStoryboardProps {
  name: string
  destinationName?: string
  startDate?: string | null
  endDate?: string | null
  days: StoryboardDay[]
}

export function TripStoryboard({ name, destinationName, startDate, endDate, days }: TripStoryboardProps) {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-sky-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-3">
            <SunMedium className="w-4 h-4" />
            Trip Storyboard
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {name}
          </h1>
          {(destinationName || startDate || endDate) && (
            <p className="text-slate-600 text-sm md:text-base flex items-center justify-center gap-3 flex-wrap">
              {destinationName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  {destinationName}
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  {startDate && endDate ? `${startDate} → ${endDate}` : startDate || endDate}
                </span>
              )}
            </p>
          )}
        </header>

        <div className="relative">
          {/* vertical line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-sky-200 via-slate-200 to-sky-200 pointer-events-none" />

          <ol className="space-y-8 md:space-y-10">
            {days.map((day, index) => {
              const isLeft = index % 2 === 0
              return (
                <li key={day.id} className="relative md:grid md:grid-cols-2 md:gap-8 items-stretch">
                  <div
                    className={`flex md:block ${isLeft ? 'md:col-start-1' : 'md:col-start-2 md:text-left'} ${
                      !isLeft ? 'md:order-2' : ''
                    }`}
                  >
                    <div className="md:hidden mr-4 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-sky-600 font-semibold border border-sky-100">
                        {index + 1}
                      </div>
                      <div className="flex-1 w-px bg-slate-200 mt-1" />
                    </div>
                    <article className="flex-1 rounded-2xl bg-white/90 shadow-sm ring-1 ring-slate-100 overflow-hidden backdrop-blur-sm">
                      {day.heroImage && (
                        <div className="h-40 w-full overflow-hidden">
                          <img
                            src={day.heroImage}
                            alt={day.title}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-5 md:p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold tracking-wide uppercase text-sky-600">
                            {day.label}
                          </span>
                          <span className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 text-sky-700 text-sm font-semibold border border-sky-100">
                            {index + 1}
                          </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-1">
                          {day.title}
                        </h2>
                        {day.subtitle && (
                          <p className="text-sm text-slate-600 mb-3">{day.subtitle}</p>
                        )}
                        {day.notes && (
                          <p className="text-sm text-slate-700 whitespace-pre-line mb-3">
                            {day.notes}
                          </p>
                        )}
                        {day.rentals && day.rentals.length > 0 && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                              Stay
                            </p>
                            <ul className="space-y-1">
                              {day.rentals.map((r) => (
                                <li key={r.id} className="text-sm text-slate-700 flex justify-between">
                                  <span className="truncate pr-2">{r.name}</span>
                                  {r.nightly_rate != null && (
                                    <span className="text-sky-700 font-semibold">
                                      ${r.nightly_rate.toLocaleString()}/night
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </article>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}

