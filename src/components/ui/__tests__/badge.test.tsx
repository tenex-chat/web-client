import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../badge';

describe('Badge', () => {
    it('renders with default variant', () => {
        render(<Badge>Test Badge</Badge>);
        const badge = screen.getByText('Test Badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveAttribute('data-slot', 'badge');
    });

    it('renders with secondary variant', () => {
        render(<Badge variant="secondary">Secondary</Badge>);
        const badge = screen.getByText('Secondary');
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('bg-secondary');
    });

    it('renders with destructive variant', () => {
        render(<Badge variant="destructive">Destructive</Badge>);
        const badge = screen.getByText('Destructive');
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('bg-destructive');
    });

    it('renders with outline variant', () => {
        render(<Badge variant="outline">Outline</Badge>);
        const badge = screen.getByText('Outline');
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('text-foreground');
    });

    it('applies custom className', () => {
        render(<Badge className="custom-class">Custom</Badge>);
        const badge = screen.getByText('Custom');
        expect(badge).toHaveClass('custom-class');
    });

    it('renders as a custom component when asChild is true', () => {
        render(
            <Badge asChild>
                <a href="/test">Link Badge</a>
            </Badge>
        );
        const link = screen.getByRole('link', { name: 'Link Badge' });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/test');
        expect(link).toHaveAttribute('data-slot', 'badge');
    });

    it('passes through additional props', () => {
        render(<Badge data-testid="test-badge">Test</Badge>);
        const badge = screen.getByTestId('test-badge');
        expect(badge).toBeInTheDocument();
    });
});