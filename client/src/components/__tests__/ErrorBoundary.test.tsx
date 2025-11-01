/**
 * Unit tests for ErrorBoundary component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, ErrorState, EmptyState } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should display error UI when error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/что-то пошло не так/i)).toBeInTheDocument();
    expect(screen.getByText(/вернуться на главную/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

describe('ErrorState', () => {
  it('should display error message', () => {
    render(<ErrorState message="Custom error message" />);
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    
    const retryButton = screen.getByText(/попробовать снова/i);
    retryButton.click();
    
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('EmptyState', () => {
  it('should display empty state message', () => {
    render(<EmptyState message="No data available" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should use default message when not provided', () => {
    render(<EmptyState />);
    expect(screen.getByText(/нет данных для отображения/i)).toBeInTheDocument();
  });
});

