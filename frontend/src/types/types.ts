export interface Asset {
  id: string;
  name: string;
  type: string;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  velocity: {
    speed: number;
    heading: number;
  };
  status: string;
  metadata: {
    country: string;
    launchDate: string | null;
    rcsSize: string;
  };
}
