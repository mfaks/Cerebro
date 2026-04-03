import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import type { Asset, AssetType, FilterPanelProps } from "../types/types";
import { ALL_TYPES, ALL_REGIMES, REGIME_LABELS } from "../hooks/useAssetFilters";

const TYPE_LABELS: Record<AssetType, string> = {
  PAYLOAD: "Payload",
  DEBRIS: "Debris",
  ROCKET_BODY: "Rocket Body",
};

const TYPE_COLORS: Record<string, string> = {
  PAYLOAD: "bg-lime-500",
  ROCKET_BODY: "bg-lime-500",
  DEBRIS: "bg-red-500",
};

function AssetList({ assets }: { assets: Asset[] }) {
  const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex flex-col px-2 py-1">
      {sorted.length === 0 && (
        <p className="text-xs text-sidebar-foreground/50 px-1 py-2">No assets loaded yet.</p>
      )}
      {sorted.map((asset) => (
        <div
          key={asset.id}
          className="flex flex-col gap-0.5 rounded px-2 py-2 hover:bg-sidebar-accent border-b border-sidebar-border last:border-0"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_COLORS[asset.type] ?? "bg-gray-400"}`} />
            <span className="flex-1 truncate text-sm font-medium text-sidebar-foreground">{asset.name}</span>
          </div>
          <div className="flex items-center justify-between pl-4">
            <span className="text-xs text-sidebar-foreground/50">{asset.type.replace("_", " ")}</span>
            <span className="text-xs text-sidebar-foreground/50">
              {Math.round(asset.position.altitude).toLocaleString()} km
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterPanel({
  filters,
  toggleType,
  toggleOrbitalRegime,
  setAltitudeMin,
  setAltitudeMax,
  reset,
  assets,
}: FilterPanelProps) {
  const [tab, setTab] = useState<"filters" | "assets">("filters");

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border pb-3">
        <div className="flex gap-1 px-2">
          <button
            onClick={() => setTab("filters")}
            className={`flex-1 rounded px-2 py-1 text-sm font-medium transition-colors ${
              tab === "filters"
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
            }`}
          >
            Filters
          </button>
          <button
            onClick={() => setTab("assets")}
            className={`flex-1 rounded px-2 py-1 text-sm font-medium transition-colors ${
              tab === "assets"
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
            }`}
          >
            Assets ({assets.length})
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {tab === "assets" && <AssetList assets={assets} />}
        {tab === "filters" && <>
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-widest text-sidebar-foreground/50">
              Object Type
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2.5 px-2">
                {ALL_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.types.has(type)}
                      onChange={() => toggleType(type)}
                      className="accent-blue-500"
                    />
                    <span className="text-sm font-medium text-sidebar-foreground">
                      {TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-widest text-sidebar-foreground/50">
              Orbital Regime
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2.5 px-2">
                {ALL_REGIMES.map((regime) => (
                  <label key={regime} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.orbitalRegimes.has(regime)}
                      onChange={() => toggleOrbitalRegime(regime)}
                      className="accent-blue-500"
                    />
                    <span className="text-sm font-medium text-sidebar-foreground">
                      {REGIME_LABELS[regime]}
                    </span>
                  </label>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-widest text-sidebar-foreground/50">
              Altitude Range (km)
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-sidebar-foreground/60">Min</p>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 400"
                    value={filters.altitudeMin}
                    onChange={(e) => setAltitudeMin(e.target.value)}
                    className="w-full bg-sidebar-accent text-sm text-sidebar-foreground rounded px-2 py-1.5 border border-sidebar-border"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-sidebar-foreground/60">Max</p>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 2000"
                    value={filters.altitudeMax}
                    onChange={(e) => setAltitudeMax(e.target.value)}
                    className="w-full bg-sidebar-accent text-sm text-sidebar-foreground rounded px-2 py-1.5 border border-sidebar-border"
                  />
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </>}
      </SidebarContent>

      {tab === "filters" && (
        <SidebarFooter className="border-t border-sidebar-border pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="w-full text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent"
          >
            Reset Filters
          </Button>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}

export default FilterPanel;
