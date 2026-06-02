import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ViewErrorBoundary } from './ViewErrorBoundary.js';

function Broken(): never {
  throw new Error('boom');
}

describe('ViewErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ViewErrorBoundary viewId="test-view">
        <span>ok</span>
      </ViewErrorBoundary>
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('shows fallback when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ViewErrorBoundary viewId="explorer">
        <Broken />
      </ViewErrorBoundary>
    );
    expect(screen.getByTestId('view-error-explorer')).toBeTruthy();
    expect(screen.getByText('boom')).toBeTruthy();
    spy.mockRestore();
  });
});
