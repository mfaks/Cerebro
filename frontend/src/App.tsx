import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAssetFilters } from "./hooks/useAssetFilters";
import FilterPanel from "./components/FilterPanel";
import MapView from "./components/MapView";
import { ModeToggle } from "./components/ModeToggle";
import Footer from "./components/Footer";

function App() {
  const { filters, toggleType, toggleOrbitalRegime, setAltitudeMin, setAltitudeMax, reset } =
    useAssetFilters();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <FilterPanel
          filters={filters}
          toggleType={toggleType}
          toggleOrbitalRegime={toggleOrbitalRegime}
          setAltitudeMin={setAltitudeMin}
          setAltitudeMax={setAltitudeMax}
          reset={reset}
        />
        <SidebarInset>
          <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Cerebro
            </h1>
            <span className="text-xs text-muted-foreground">
              A Live Satellite Tracker
            </span>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <MapView filters={filters} />
          </div>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default App;
