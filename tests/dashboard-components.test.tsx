import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AqiOverviewCard } from "@/components/dashboard/aqi-overview-card";
import { PollutantGrid } from "@/components/dashboard/pollutant-grid";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { TelemetryErrorState, StaleDataWarning } from "@/components/dashboard/telemetry-state-views";
import type { AqiDetail, PollutantMeasurement, WeatherCondition } from "@/lib/telemetry/types";

describe("Dashboard UI Components", () => {
  it("renders distinct Indian CPCB NAQI and US EPA AQI without confusing standards", () => {
    const mockCpcb: AqiDetail = {
      standard: "IN_CPCB",
      name: "CPCB Indian National AQI",
      value: 312,
      category: "Very Poor",
      dominantPollutant: "PM2.5",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-rose-700 bg-rose-50",
      methodology: "model-derived-cpcb-method",
    };

    const mockUsAqi: AqiDetail = {
      standard: "US_EPA",
      name: "US EPA Air Quality Index",
      value: 195,
      category: "Unhealthy",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-orange-700 bg-orange-50",
      methodology: "modeled-forecast",
    };

    const mockEuropeanAqi: AqiDetail = {
      standard: "EU_EAQI",
      name: "European Air Quality Index",
      value: 4,
      category: "Poor",
      scaleMin: 1,
      scaleMax: 6,
      colorClass: "text-orange-700 bg-orange-50",
      methodology: "modeled-forecast",
    };

    render(
      <AqiOverviewCard
        cpcbAqi={mockCpcb}
        usAqi={mockUsAqi}
        europeanAqi={mockEuropeanAqi}
      />
    );

    // Primary CPCB section
    expect(screen.getByText("Indian National Air Quality Index (NAQI)")).toBeDefined();
    expect(screen.getByText("312")).toBeDefined();
    expect(screen.getByText("Very Poor")).toBeDefined();
    expect(screen.getByText("Standard: IN-CPCB (2014)")).toBeDefined();

    // International US EPA section
    expect(screen.getByText("US EPA Air Quality Index")).toBeDefined();
    expect(screen.getByText("195")).toBeDefined();
    expect(screen.getByText("Unhealthy")).toBeDefined();
  });

  it("renders truthful unavailable state when CPCB criteria are not met", () => {
    const unavailableCpcb: AqiDetail = {
      standard: "IN_CPCB",
      name: "CPCB Indian National AQI",
      value: null,
      category: "Unavailable",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-slate-500 bg-slate-100",
      methodology: "model-derived-cpcb-method",
      unavailabilityReason:
        "Indian AQI estimate unavailable: Minimum 3 pollutants required for CPCB NAQI calculation.",
    };

    const mockUsAqi: AqiDetail = {
      standard: "US_EPA",
      name: "US EPA Air Quality Index",
      value: 110,
      category: "Moderate",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-amber-700 bg-amber-50",
      methodology: "modeled-forecast",
    };

    const mockEuropeanAqi: AqiDetail = {
      standard: "EU_EAQI",
      name: "European Air Quality Index",
      value: 2,
      category: "Fair",
      scaleMin: 1,
      scaleMax: 6,
      colorClass: "text-teal-700 bg-teal-50",
      methodology: "modeled-forecast",
    };

    render(
      <AqiOverviewCard
        cpcbAqi={unavailableCpcb}
        usAqi={mockUsAqi}
        europeanAqi={mockEuropeanAqi}
      />
    );

    expect(screen.getByText("Indian AQI estimate unavailable")).toBeDefined();
    expect(
      screen.getByText("Data Sufficiency Requirement Not Met")
    ).toBeDefined();
    expect(
      screen.getByText(/Minimum 3 pollutants required for CPCB NAQI calculation/i)
    ).toBeDefined();
  });

  it("renders pollutant grid with explicit µg/m³ units and WHO comparisons", () => {
    const mockPollutants: PollutantMeasurement[] = [
      {
        code: "pm2_5",
        name: "Particulate Matter PM2.5",
        value: 75.4,
        unit: "µg/m³",
        averagingPeriod: "24-hr rolling (CPCB standard)",
        who24hGuideline: 15,
        status: "available",
      },
      {
        code: "pm10",
        name: "Particulate Matter PM10",
        value: 135.0,
        unit: "µg/m³",
        averagingPeriod: "24-hr rolling (CPCB standard)",
        who24hGuideline: 45,
        status: "available",
      },
    ];

    render(<PollutantGrid pollutants={mockPollutants} />);

    expect(screen.getByText("Particulate Matter PM2.5")).toBeDefined();
    expect(screen.getByText("75.4")).toBeDefined();
    expect(screen.getAllByText("µg/m³").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("5.0x WHO")).toBeDefined();
  });

  it("renders weather widget with temperature in °C and wind speed in km/h", () => {
    const mockWeather: WeatherCondition = {
      temperatureC: 26.2,
      apparentTemperatureC: 27.5,
      relativeHumidityPercent: 48,
      windSpeedKmH: 12.6,
      windDirectionDegrees: 180,
      surfacePressureHPa: 1014,
      weatherCode: 0,
      weatherLabel: "Clear Sky",
    };

    render(<WeatherWidget weather={mockWeather} />);

    expect(screen.getByText("26.2°C")).toBeDefined();
    expect(screen.getByText("48%")).toBeDefined();
    expect(screen.getByText("12.6")).toBeDefined();
    expect(screen.getByText(/Condition: Clear Sky/)).toBeDefined();
  });

  it("triggers onRetry callback when Retry Connection is clicked in error state", () => {
    const handleRetry = vi.fn();
    render(
      <TelemetryErrorState
        errorMessage="Open-Meteo connection timed out"
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText("Environmental Telemetry Service Offline")).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /Retry Connection/i });
    fireEvent.click(retryBtn);

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders stale data warning banner correctly", () => {
    render(<StaleDataWarning lastUpdated="2026-11-20T10:00:00Z" />);
    expect(screen.getByText(/Notice: Telemetry Freshness Window Exceeded/)).toBeDefined();
  });
});
