import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/app/error";
import NotFound from "@/app/not-found";

describe("Application Error Boundary (app/error.tsx)", () => {
  it("renders error state UI with accessible heading and user-friendly message", () => {
    const dummyError = new Error("Test client rendering failure") as Error & { digest?: string };
    dummyError.digest = "TEST_DIGEST_12345";
    const resetSpy = vi.fn();

    render(<ErrorBoundary error={dummyError} reset={resetSpy} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Something unexpected occurred");
    expect(screen.getByText(/Diagnostic Reference: TEST_DIGEST_12345/i)).toBeDefined();

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainBtn).toBeDefined();

    fireEvent.click(tryAgainBtn);
    expect(resetSpy).toHaveBeenCalledTimes(1);

    const homeLink = screen.getByRole("link", { name: /return home/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });
});

describe("Application 404 Route (app/not-found.tsx)", () => {
  it("renders accessible 404 page with navigation links", () => {
    render(<NotFound />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Page Not Found");
    expect(screen.getByText(/404 Error/i)).toBeDefined();

    const dashboardLink = screen.getByRole("link", { name: /go to dashboard/i });
    expect(dashboardLink.getAttribute("href")).toBe("/dashboard");

    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });
});
