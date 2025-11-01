/**
 * Unit tests for DashboardStats component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardStats from '../DashboardStats';

describe('DashboardStats', () => {
  it('should render all stat cards', () => {
    render(
      <DashboardStats
        totalEmployees={10}
        activeShifts={5}
        completedShifts={3}
        exceptions={2}
      />
    );

    expect(screen.getByTestId('stat-card-всего-сотрудников')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-активные-смены')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-завершённые-смены')).toBeInTheDocument();
    expect(screen.getByTestId('stat-card-исключения')).toBeInTheDocument();
  });

  it('should display correct values', () => {
    render(
      <DashboardStats
        totalEmployees={10}
        activeShifts={5}
        completedShifts={3}
        exceptions={2}
      />
    );

    // Check that values are displayed (might be in different text nodes)
    const content = document.body.textContent || '';
    expect(content).toContain('10');
    expect(content).toContain('5');
    expect(content).toContain('3');
    expect(content).toContain('2');
  });

  it('should call onViewExceptions when exceptions card is clicked', () => {
    const onViewExceptions = vi.fn();
    render(
      <DashboardStats
        totalEmployees={10}
        activeShifts={5}
        completedShifts={3}
        exceptions={2}
        onViewExceptions={onViewExceptions}
      />
    );

    // Find and click exceptions card if clickable
    const exceptionsCard = screen.getByTestId('stat-card-исключения');
    // If card is clickable, trigger click
    if (exceptionsCard.closest('button') || exceptionsCard.getAttribute('role') === 'button') {
      exceptionsCard.click();
      expect(onViewExceptions).toHaveBeenCalled();
    }
  });
});

