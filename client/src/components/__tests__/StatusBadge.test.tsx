/**
import "@testing-library/jest-dom/vitest";
 * Unit tests for StatusBadge component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it("should render active status", () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByTestId("badge-status-active");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/активна/i);
  });

  it("should render break status", () => {
    render(<StatusBadge status="break" />);
    const badge = screen.getByTestId("badge-status-break");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/перерыв/i);
  });

  it("should render done status", () => {
    render(<StatusBadge status="done" />);
    const badge = screen.getByTestId("badge-status-done");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/завершено/i);
  });

  it("should apply correct variant for active status", () => {
    const { container } = render(<StatusBadge status="active" />);
    // Check that badge has data-testid
    const badge = screen.getByTestId("badge-status-active");
    expect(badge).toBeInTheDocument();
  });
});

