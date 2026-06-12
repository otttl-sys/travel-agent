export type LatLng = { lat: number; lng: number };

export type NearbyPlace = {
  name: string;
  address: string;
  rating?: number;
  category: string;
  icon: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  tourist_attraction: "🏛️",
  museum: "🎨",
  art_gallery: "🖼️",
  park: "🌳",
  restaurant: "🍽️",
  cafe: "☕",
  bar: "🍸",
  bakery: "🥐",
  shopping_mall: "🛍️",
  lodging: "🏨",
  transit_station: "🚌",
  subway_station: "🚇",
  beach: "🏖️",
  church: "⛪",
  synagogue: "🕍",
  mosque: "🕌",
  amusement_park: "🎡",
  zoo: "🦁",
  aquarium: "🐠",
  night_club: "🎶",
  spa: "💆",
};

function key(): string {
  return process.env.GOOGLE_MAPS_API_KEY!;
}

export async function geocode(address: string): Promise<{ latlng: LatLng; formatted: string }> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key()}`
  );
  const data = await res.json() as { status: string; results: { geometry: { location: LatLng }; formatted_address: string }[] };
  if (data.status !== "OK" || !data.results?.length) throw new Error(`Geocoding failed: ${data.status}`);
  const r = data.results[0];
  return { latlng: r.geometry.location, formatted: r.formatted_address };
}

export async function searchNearby(latlng: LatLng, type: string, limit = 8): Promise<NearbyPlace[]> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latlng.lat},${latlng.lng}&radius=5000&type=${type}&rankby=prominence&key=${key()}`
  );
  const data = await res.json() as { results?: { name: string; vicinity: string; rating?: number; types?: string[] }[] };
  if (!data.results) return [];
  return data.results.slice(0, limit).map(r => {
    const cat = r.types?.[0] ?? "place";
    return {
      name: r.name,
      address: r.vicinity,
      rating: r.rating,
      category: cat.replace(/_/g, " "),
      icon: CATEGORY_ICONS[cat] ?? "📍",
    };
  });
}

export type MapMarker = { lat: number; lng: number; label?: string };

export function staticMapUrl(address: string, width = 800, height = 380, zoom = 13, markers?: MapMarker[]): string {
  const enc = encodeURIComponent(address);
  let markerParams = `markers=color:0x4f46e5%7C${enc}`;
  for (const m of markers ?? []) {
    const label = m.label && /^[A-Za-z0-9]$/.test(m.label) ? `label:${m.label}%7C` : "";
    markerParams += `&markers=color:0xe85d3a%7C${label}${m.lat},${m.lng}`;
  }
  return `https://maps.googleapis.com/maps/api/staticmap?center=${enc}&zoom=${zoom}&size=${width}x${height}&scale=2&${markerParams}&style=feature:poi%7Cvisibility:simplified&key=${key()}`;
}
