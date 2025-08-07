import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error for testing
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('Test error message');
    }
    return <div>No error</div>;
}

describe('ErrorBoundary', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Suppress console.error for these tests
        consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as unknown as MockInstance<unknown[], unknown>;
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders error UI when child component throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('An error occurred while rendering this component.')).toBeInTheDocument();
    });

    it('displays error details when available', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        // Click on error details to expand
        const detailsElement = screen.getByText('Error details');
        fireEvent.click(detailsElement);
        
        expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
        const customFallback = <div>Custom error UI</div>;
        render(
            <ErrorBoundary fallback={customFallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(screen.getByText('Custom error UI')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
        const onError = vi.fn();
        render(
            <ErrorBoundary onError={onError}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Test error message' }),
            expect.any(Object)
        );
    });

    it('resets error state when Try again button is clicked', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        
        // Click Try again button - this should reset the error state
        const tryAgainButton = screen.getByRole('button', { name: 'Try again' });
        fireEvent.click(tryAgainButton);
        
        // After reset, the error boundary should try to render children again
        // Since we're not changing the component, it would throw again
        // So we expect the error UI to reappear
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('logs error to console', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        
        expect(consoleSpy).toHaveBeenCalledWith(
            'ErrorBoundary caught error:',
            expect.objectContaining({ message: 'Test error message' }),
            expect.any(Object)
        );
    });
});