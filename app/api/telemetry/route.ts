import { NextRequest, NextResponse } from "next/server";
import {
  findLocationById,
  validateCoordinates,
  DEFAULT_LOCATION,
} from "@/lib/telemetry/locations";
import {
  fetchServerTelemetryWithMeta,
  TelemetryUpstreamError,
} from "@/lib/telemetry/server-provider";
import type { LocationMetadata } from "@/lib/telemetry/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    let location: LocationMetadata;

    if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (!validateCoordinates(lat, lon)) {
        return NextResponse.json(
          { error: "Invalid coordinate bounds. Latitude must be in [-90, 90], Longitude in [-180, 180]." },
          { status: 400 }
        );
      }
      location = {
        id: `custom-${lat.toFixed(4)}-${lon.toFixed(4)}`,
        name: searchParams.get("name") || "Custom Coordinates",
        region: searchParams.get("region") || "User Selected",
        country: searchParams.get("country") || "World",
        latitude: lat,
        longitude: lon,
        timezone: "auto",
        modelDomain: "CAMS Global (IFS-AER / ECMWF)",
      };
    } else if (locationId) {
      location = findLocationById(locationId);
    } else {
      location = DEFAULT_LOCATION;
    }

    const { data, cacheHit } = await fetchServerTelemetryWithMeta(location);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
        "X-AERIS-Cache": cacheHit ? "HIT" : "MISS",
      },
    });
  } catch (err: unknown) {
    if (err instanceof TelemetryUpstreamError) {
      return NextResponse.json(
        err.details ? { error: err.message, details: err.details } : { error: err.message },
        { status: err.statusCode }
      );
    }

    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { error: "Environmental telemetry service unavailable", details: message },
      { status: 504 }
    );
  }
}
