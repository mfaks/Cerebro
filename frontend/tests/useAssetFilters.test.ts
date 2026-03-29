import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetFilters, ALL_TYPES, ALL_REGIMES } from '../src/hooks/useAssetFilters';

describe('useAssetFilters', () => {
  it('initialises with all types selected', () => {
    const { result } = renderHook(() => useAssetFilters());
    for (const type of ALL_TYPES) {
      expect(result.current.filters.types.has(type)).toBe(true);
    }
  });

  it('initialises with all orbital regimes selected and empty altitude range', () => {
    const { result } = renderHook(() => useAssetFilters());
    for (const regime of ALL_REGIMES) {
      expect(result.current.filters.orbitalRegimes.has(regime)).toBe(true);
    }
    expect(result.current.filters.altitudeMin).toBe('');
    expect(result.current.filters.altitudeMax).toBe('');
  });

  it('toggleType removes a type when it is already selected', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.toggleType('DEBRIS');
    });
    expect(result.current.filters.types.has('DEBRIS')).toBe(false);
  });

  it('toggleType adds a type back when it is not selected', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.toggleType('DEBRIS');
    });
    act(() => {
      result.current.toggleType('DEBRIS');
    });
    expect(result.current.filters.types.has('DEBRIS')).toBe(true);
  });

  it('toggleOrbitalRegime removes a regime when it is already selected', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.toggleOrbitalRegime('LEO');
    });
    expect(result.current.filters.orbitalRegimes.has('LEO')).toBe(false);
  });

  it('setAltitudeMin and setAltitudeMax update altitude range', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.setAltitudeMin('400');
      result.current.setAltitudeMax('2000');
    });
    expect(result.current.filters.altitudeMin).toBe('400');
    expect(result.current.filters.altitudeMax).toBe('2000');
  });

  it('reset restores all defaults', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.toggleType('PAYLOAD');
      result.current.toggleOrbitalRegime('GEO');
      result.current.setAltitudeMin('400');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.filters.types.size).toBe(ALL_TYPES.length);
    expect(result.current.filters.orbitalRegimes.size).toBe(ALL_REGIMES.length);
    expect(result.current.filters.altitudeMin).toBe('');
    expect(result.current.filters.altitudeMax).toBe('');
  });
});
