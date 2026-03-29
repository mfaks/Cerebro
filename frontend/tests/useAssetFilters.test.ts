import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetFilters, ALL_TYPES } from '../src/hooks/useAssetFilters';

describe('useAssetFilters', () => {
  it('initialises with all types selected', () => {
    const { result } = renderHook(() => useAssetFilters());
    for (const type of ALL_TYPES) {
      expect(result.current.filters.types.has(type)).toBe(true);
    }
  });

  it('initialises with Global region and empty time range', () => {
    const { result } = renderHook(() => useAssetFilters());
    expect(result.current.filters.regionLabel).toBe('Global');
    expect(result.current.filters.startTime).toBe('');
    expect(result.current.filters.endTime).toBe('');
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

  it('setRegionLabel updates the region', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.setRegionLabel('Europe');
    });
    expect(result.current.filters.regionLabel).toBe('Europe');
  });

  it('setStartTime and setEndTime update time range', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.setStartTime('2026-01-01T00:00');
      result.current.setEndTime('2026-12-31T23:59');
    });
    expect(result.current.filters.startTime).toBe('2026-01-01T00:00');
    expect(result.current.filters.endTime).toBe('2026-12-31T23:59');
  });

  it('reset restores all defaults', () => {
    const { result } = renderHook(() => useAssetFilters());
    act(() => {
      result.current.toggleType('PAYLOAD');
      result.current.setRegionLabel('Asia-Pacific');
      result.current.setStartTime('2026-01-01T00:00');
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.filters.types.size).toBe(ALL_TYPES.length);
    expect(result.current.filters.regionLabel).toBe('Global');
    expect(result.current.filters.startTime).toBe('');
    expect(result.current.filters.endTime).toBe('');
  });
});
