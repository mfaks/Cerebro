import { publish } from "../queue/producer.js";
import type { TLEPayload } from "../types/types.js";


const SPACETRACK_LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
const SPACETRACK_TLE_URL = 'https://www.space-track.org/basicspacedata/query/class/gp/NORAD_CAT_ID';

const CATALOG_IDS = [
  // Payloads
  '25544', // ISS (ZARYA)
  '20580', // HST
  '25994', // Terra
  '43013', // NOAA 20
  '39084', // Landsat 8
  '41866', // GOES 16
  '51850', // GOES 18
  '40697', // Sentinel-2A
  '48274', // CSS Tianhe
  '37847', // Galileo-FM2
  '26599', // BeiDou 1
  '24795', // Iridium 5
  '44057', // OneWeb-0012
  '37843', // Viasat-1
  '32060', // WorldView-1
  '23710', // RADARSAT
  '37344', // Elektro-L
  '36131', // DirecTV 12
  '35493', // Sirius FM-5
  '28626', // XM-3
  '44718', // Starlink-1012
  '40267', // Himawari 8

  // Rocket Bodies
  '22830', // Ariane 40 R/B
  '37253', // Falcon 9 R/B

  // Debris
  '37762', // Delta 1 Deb
];

// login function used to get the session cookie for the Space-Track API
async function login(): Promise<string> {
    const user = process.env['SPACETRACK_USER'];
    const password = process.env['SPACETRACK_PASSWORD'];
    if (!user || !password) {
        throw new Error('SPACETRACK_USER and SPACETRACK_PASSWORD are required');
    }

    const response = await fetch(SPACETRACK_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `identity=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}`
    });

    if (!response.ok) {
        throw new Error('Space-Track login failed')
    }
    
    const rawCookie = response.headers.get('Set-Cookie');
    if (!rawCookie) {
        throw new Error('No session cookies received from Space-Track');
    }

    return rawCookie.split(';')[0]!;
}

// fetchTLEs function used to fetch the TLEs for the given catalog IDs
async function fetchTLEs(cookie: string): Promise<TLEPayload[]> {
    const ids = CATALOG_IDS.join(',');
    const response = await fetch(`${SPACETRACK_TLE_URL}/${ids}/format/3le`, {
        headers: {
            'Cookie': cookie,
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch TLE from Space-Track (HTTP ${response.status})`)
    }
    const lines = (await response.text()).split('\n').map((line) => line.trim()).filter(Boolean);
    const payloads: TLEPayload[] = [];
    for (let i = 0; i < lines.length; i += 3) {
        const name = lines[i]?.replace(/^0\s+/, '');
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];
        if (name && line1 && line2) {
            payloads.push({ name, line1, line2 });
        }
    }
    return payloads;
}

// runIngestionWorker function used to run the ingestion worker
async function runIngestionWorker(): Promise<void> {
    console.log('[ingest] Starting ingestion worker');
    try {
        const cookie = await login();
        const payloads = await fetchTLEs(cookie);
        for (const payload of payloads) {
            await publish('tle.ingest', payload);
        }
        console.log('[ingest] Successfully fetched and published TLEs to queue');
    } catch (error) {
        console.error('[ingest] Error:', error);
    }
}

// startIngestionWorker function used to start the ingestion worker
export function startIngestionWorker(): void {
    const interval = Number(process.env['INGEST_INTERVAL_MS'] ?? 3600000);
    void runIngestionWorker();
    setInterval(() => { void runIngestionWorker(); }, interval);
    console.log(`[ingest] Ingestion worker started every ${interval / 60000} minutes`);
}