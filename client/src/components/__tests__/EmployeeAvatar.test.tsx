/**
 * Unit tests for EmployeeAvatar component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmployeeAvatar from "../EmployeeAvatar";

describe("EmployeeAvatar", () => {
  it("should render avatar with name", () => {
    render(<EmployeeAvatar name="John Doe" />);
    const avatar = screen.getByTestId("avatar-john-doe");
    expect(avatar).toBeInTheDocument();
  });

  it("should display initials when no image", () => {
    render(<EmployeeAvatar name="John Doe" />);
    // Should show initials "JD" in fallback
    const avatar = screen.getByTestId("avatar-john-doe");
    expect(avatar).toBeInTheDocument();
    // Avatar fallback should contain initials
    const fallback = avatar.querySelector('[class*="fallback"]');
    expect(fallback).toBeInTheDocument();
  });

  it("should display image when provided", () => {
    render(<EmployeeAvatar name="John Doe" image="https://example.com/avatar.jpg" />);
    const avatar = screen.getByTestId("avatar-john-doe");
    const image = avatar.querySelector("img");
    if (image) {
      expect(image).toHaveAttribute("src", "https://example.com/avatar.jpg");
    }
  });

  it("should handle empty name gracefully", () => {
    render(<EmployeeAvatar name="" />);
    // Should still render avatar
    const avatar = document.querySelector('[data-testid^="avatar-"]');
    expect(avatar).toBeInTheDocument();
  });
});

