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
import type { AssetType, FilterPanelProps } from "../types/types";
import { ALL_TYPES, REGIONS } from "../hooks/useAssetFilters";

const TYPE_LABELS: Record<AssetType, string> = {
  PAYLOAD: "Payload",
  DEBRIS: "Debris",
  ROCKET_BODY: "Rocket Body",
};

function FilterPanel({
  filters,
  toggleType,
  setRegionLabel,
  setStartTime,
  setEndTime,
  reset,
}: FilterPanelProps) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border pb-3">
        <h2 className="px-2 text-base font-semibold tracking-tight text-sidebar-foreground">
          Filters
        </h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-widest text-sidebar-foreground/50">
            Object Type
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2.5 px-2">
              {ALL_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
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
            Region
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2">
              <select
                value={filters.regionLabel}
                onChange={(e) => setRegionLabel(e.target.value)}
                className="w-full bg-sidebar-accent text-sm font-medium text-sidebar-foreground rounded px-2 py-1.5 border border-sidebar-border"
              >
                {REGIONS.map((r) => (
                  <option key={r.label} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-widest text-sidebar-foreground/50">
            Time Range
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-sidebar-foreground/60">From</p>
                <input
                  type="datetime-local"
                  value={filters.startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-sidebar-accent text-sm text-sidebar-foreground rounded px-2 py-1.5 border border-sidebar-border"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-sidebar-foreground/60">To</p>
                <input
                  type="datetime-local"
                  value={filters.endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-sidebar-accent text-sm text-sidebar-foreground rounded px-2 py-1.5 border border-sidebar-border"
                />
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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

      <SidebarRail />
    </Sidebar>
  );
}

export default FilterPanel;