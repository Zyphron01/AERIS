import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import IndoorAirPage from "@/app/indoor-air/page";
import ScenariosPage from "@/app/scenarios/page";

describe("Subroute Placeholders Verification (Milestones 4 & 5 Targets)", () => {
  it("renders Indoor Air Coach navigation and page structure", () => {
    render(<IndoorAirPage />);
    expect(screen.getByText("Indoor Air Coach")).toBeDefined();
    expect(screen.getByRole("link", { name: /Back to Home/i }).getAttribute("href")).toBe(
      "/"
    );
  });

  it("renders What-If Scenario Simulator navigation and page structure", () => {
    render(<ScenariosPage />);
    expect(
      screen.getByText("What-If Scenario Simulator")
    ).toBeDefined();
    expect(screen.getByRole("link", { name: /Back to Home/i }).getAttribute("href")).toBe(
      "/"
    );
  });
});
