"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSavedTrips, deleteTrip, type SavedTrip } from "@/lib/saved-trips";

export default function SavedPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setTrips(getSavedTrips());
  }, []);

  function handleDelete(id: string) {
    deleteTrip(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (expanded === id) setExpanded(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-gray-900">
            ✈ TravelAgent
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/packing"
              className="text-sm text-gray-500 hidden sm:block hover:text-indigo-600 transition-colors"
            >
              Packing List
            </Link>
            <Link href="/plan">
              <Button size="sm">Plan a trip</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Saved Trips</h1>
            <p className="text-gray-500 mt-1">
              {trips.length} {trips.length === 1 ? "trip" : "trips"} saved
            </p>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">✈️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved trips yet</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Plan a trip and tap &quot;Save Trip&quot; to see it here.
              </p>
              <Link href="/plan">
                <Button>Plan your first trip →</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {trip.isMultiCity
                              ? trip.cities.join(" → ")
                              : trip.destination}
                          </h3>
                          {trip.isMultiCity && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Multi-City
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                          {trip.startDate && (
                            <span>
                              📅 {trip.startDate}
                              {trip.endDate ? ` → ${trip.endDate}` : ""}
                            </span>
                          )}
                          <span>
                            👥 {trip.travelers}{" "}
                            {trip.travelers === 1 ? "person" : "people"}
                          </span>
                          <span>💶 €{trip.budget.toLocaleString()} / person</span>
                          <span className="text-gray-400">
                            Saved{" "}
                            {new Date(trip.savedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpanded((prev) =>
                              prev === trip.id ? null : trip.id
                            )
                          }
                        >
                          {expanded === trip.id ? "Hide" : "View Plan"}
                        </Button>
                        <button
                          onClick={() => handleDelete(trip.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none p-1"
                          aria-label="Delete trip"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>

                  {expanded === trip.id && trip.aiResult && (
                    <div className="border-t border-gray-100 p-6">
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                        <ReactMarkdown>{trip.aiResult}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
