import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@arcgis/core/layers/GraphicsLayer', () => ({ default: vi.fn() }));
vi.mock('@arcgis/core/geometry/Point', () => ({ default: vi.fn() }));
vi.mock('@arcgis/core/symbols/SimpleMarkerSymbol', () => ({ default: vi.fn() }));
vi.mock('@arcgis/core/Graphic', () => ({ default: vi.fn() }));
vi.mock('@arcgis/core/views/MapView', () => ({ default: vi.fn() }));

import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import { renderAssets } from '../../src/layers/assetLayer';
import type { Asset } from '../../src/types/types';

function makeAsset(type: string, altitude = 400): Asset {
  return {
    id: '1',
    name: 'TEST',
    type,
    status: 'ACTIVE',
    position: { latitude: 0, longitude: 0, altitude },
    velocity: { speed: 7, heading: 0 },
    lastUpdated: '2026-01-01T00:00:00Z',
    metadata: { country: 'US', launchDate: null, rcsSize: 'LARGE' },
  };
}

describe('renderAssets', () => {
  const mockLayer = { removeAll: vi.fn(), add: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the layer before rendering', () => {
    renderAssets(mockLayer as never, []);
    expect(mockLayer.removeAll).toHaveBeenCalledOnce();
  });

  it('adds one graphic per asset', () => {
    renderAssets(mockLayer as never, [makeAsset('PAYLOAD'), makeAsset('DEBRIS')]);
    expect(mockLayer.add).toHaveBeenCalledTimes(2);
  });

  it('renders DEBRIS assets with red color', () => {
    renderAssets(mockLayer as never, [makeAsset('DEBRIS')]);
    expect(vi.mocked(SimpleMarkerSymbol)).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red' }),
    );
  });

  it('renders PAYLOAD and ROCKET_BODY assets with lime color', () => {
    renderAssets(mockLayer as never, [makeAsset('PAYLOAD'), makeAsset('ROCKET_BODY')]);
    const calls = vi.mocked(SimpleMarkerSymbol).mock.calls;
    expect(calls[0]?.[0]).toMatchObject({ color: 'lime' });
    expect(calls[1]?.[0]).toMatchObject({ color: 'lime' });
  });

  it('does nothing when asset list is empty', () => {
    renderAssets(mockLayer as never, []);
    expect(mockLayer.add).not.toHaveBeenCalled();
  });
});
