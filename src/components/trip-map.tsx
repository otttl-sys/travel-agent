import type { MapMarker } from "@/lib/google-maps";

type TripMapProps = {
  destination: string;
  markers?: MapMarker[];
  height?: number;
  className?: string;
};

export function TripMap({ destination, markers, height = 220, className }: TripMapProps) {
  const params = new URLSearchParams({ destination });
  if (markers?.length) params.set("markers", JSON.stringify(markers));

  return (
    <div className={`rounded-xl overflow-hidden border border-[#e5e2dc] ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/map-image?${params.toString()}`}
        alt={`Map of ${destination}`}
        className="w-full object-cover"
        style={{ height }}
      />
    </div>
  );
}
