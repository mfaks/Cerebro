import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import FilterPanel from '../src/components/FilterPanel';
import type { Filters } from '../src/types/types';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function makeFilters(overrides?: Partial<Filters>): Filters {
  return {
    types: new Set(['PAYLOAD', 'DEBRIS', 'ROCKET_BODY']),
    orbitalRegimes: new Set(['LEO', 'MEO', 'GEO', 'HEO']),
    altitudeMin: '',
    altitudeMax: '',
    ...overrides,
  };
}

function renderFilterPanel(filters: Filters, overrides = {}) {
  const props = {
    filters,
    toggleType: vi.fn(),
    toggleOrbitalRegime: vi.fn(),
    setAltitudeMin: vi.fn(),
    setAltitudeMax: vi.fn(),
    reset: vi.fn(),
    assets: [],
    ...overrides,
  };
  const utils = render(
    <SidebarProvider>
      <FilterPanel {...props} />
    </SidebarProvider>,
  );
  return { ...utils, props };
}

describe('FilterPanel', () => {
  it('renders without crashing', () => {
    renderFilterPanel(makeFilters());
    expect(screen.getByText('Filters')).toBeDefined();
  });

  it('renders all three object type checkboxes', () => {
    renderFilterPanel(makeFilters());
    expect(screen.getByLabelText(/payload/i)).toBeDefined();
    expect(screen.getByLabelText(/debris/i)).toBeDefined();
    expect(screen.getByLabelText(/rocket body/i)).toBeDefined();
  });

  it('calls toggleType when a checkbox is clicked', () => {
    const { props } = renderFilterPanel(makeFilters());
    fireEvent.click(screen.getByLabelText(/debris/i));
    expect(props.toggleType).toHaveBeenCalledWith('DEBRIS');
  });

  it('calls reset when Reset Filters button is clicked', () => {
    const { props } = renderFilterPanel(makeFilters());
    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(props.reset).toHaveBeenCalledOnce();
  });

  it('reflects checked state from filters.types', () => {
    const filters = makeFilters({ types: new Set(['PAYLOAD']) });
    renderFilterPanel(filters);
    const debrisCheckbox = screen.getByLabelText(/debris/i) as HTMLInputElement;
    expect(debrisCheckbox.checked).toBe(false);
    const payloadCheckbox = screen.getByLabelText(/payload/i) as HTMLInputElement;
    expect(payloadCheckbox.checked).toBe(true);
  });
});
