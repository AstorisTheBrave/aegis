import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderLogo } from './ProviderLogo.js';

describe('ProviderLogo', () => {
  it('uses the official icon data for a known provider', () => {
    const { container } = render(<ProviderLogo provider="GitHub" />);

    expect(screen.getByRole('img', { name: 'GitHub' })).toBeInTheDocument();
    expect(container.querySelector('svg path')).toBeInTheDocument();
  });

  it('keeps an accessible fallback for a connector without a registered mark', () => {
    render(<ProviderLogo provider="Design Tool" />);

    expect(screen.getByRole('img', { name: 'Design Tool' })).toHaveTextContent('D');
  });
});
