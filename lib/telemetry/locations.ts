/**
 * AERIS — Supported Demonstration Locations
 * Starting with Delhi NCR as the default demonstration region.
 */

import type { LocationMetadata } from "./types";

export const DEFAULT_LOCATION: LocationMetadata = {
  id: "delhi-ncr",
  name: "Delhi NCR",
  region: "National Capital Region",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209,
  elevationMeters: 214,
  timezone: "Asia/Kolkata",
  modelDomain: "CAMS Global (IFS-AER / ECMWF)",
};

export const SUPPORTED_LOCATIONS: readonly LocationMetadata[] = [
  DEFAULT_LOCATION,
  {
    id: "mumbai",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    latitude: 19.076,
    longitude: 72.8777,
    elevationMeters: 14,
    timezone: "Asia/Kolkata",
    modelDomain: "CAMS Global (IFS-AER / ECMWF)",
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    region: "Karnataka",
    country: "India",
    latitude: 12.9716,
    longitude: 77.5946,
    elevationMeters: 920,
    timezone: "Asia/Kolkata",
    modelDomain: "CAMS Global (IFS-AER / ECMWF)",
  },
  {
    id: "kolkata",
    name: "Kolkata",
    region: "West Bengal",
    country: "India",
    latitude: 22.5726,
    longitude: 88.3639,
    elevationMeters: 9,
    timezone: "Asia/Kolkata",
    modelDomain: "CAMS Global (IFS-AER / ECMWF)",
  },
  {
    id: "london",
    name: "London",
    region: "Greater London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    elevationMeters: 25,
    timezone: "Europe/London",
    modelDomain: "CAMS European Regional Ensemble (10km)",
  },
  {
    id: "new-york",
    name: "New York",
    region: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
    elevationMeters: 10,
    timezone: "America/New_York",
    modelDomain: "CAMS Global / NOAA GEOS-FP",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    region: "Kanto",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    elevationMeters: 40,
    timezone: "Asia/Tokyo",
    modelDomain: "CAMS Global / JMA Regional",
  },
];

export function findLocationById(id: string): LocationMetadata {
  return SUPPORTED_LOCATIONS.find((loc) => loc.id === id) ?? DEFAULT_LOCATION;
}

export function validateCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
