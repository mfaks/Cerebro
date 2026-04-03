import { publish } from "../queue/producer.js";
import type { TLEPayload } from "../types/types.js";


const SPACETRACK_LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
const SPACETRACK_TLE_URL = 'https://www.space-track.org/basicspacedata/query/class/gp/CATNR';

const CATALOG_IDS = [
  '25544', // ISS
  '20580', // Hubble Space Telescope
  '25994', // Terra
  '27424', // Aqua
  '29155', // Aura
  '28868', // CloudSat
  '29107', // CALIPSO
  '28654', // NOAA 18
  '33591', // NOAA 19
  '25338', // NOAA 15
  '37849', // Suomi NPP
  '43013', // NOAA 20 (JPSS-1)
  '39084', // Landsat 8
  '49260', // Landsat 9
  '41866', // GOES-16
  '43226', // GOES-17
  '51850', // GOES-18
  '36508', // CryoSat-2
  '43613', // ICESat-2
  '39574', // GPM Core Observatory
  '40697', // Sentinel-2A
  '42063', // Sentinel-2B
  '41335', // Sentinel-3A
  '43137', // Sentinel-3B
  '43641', // ICON
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
    
    const cookie = response.headers.get('Set-Cookie');
    if (!cookie) {
        throw new Error('No session cookies received from Space-Track');
    }

    return cookie;
}

// fetchTLEs function used to fetch the TLEs for the given catalog IDs
async function fetchTLEs(cookie: string): Promise<TLEPayload[]> {
    const ids = CATALOG_IDS.join(',');
    const response = await fetch(`${SPACETRACK_TLE_URL}/${ids}/format/tle`, {
        headers: {
            'Cookie': cookie,
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch TLE from Space-Track')
    }
    const lines = (await response.text()).split('\n').map((line) => line.trim()).filter(Boolean);
    const payloads: TLEPayload[] = [];
    for (let i = 0; i < lines.length; i += 3) {
        const name = lines[i];
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
    const interval = Number(process.env['INGESTION_INTERVAL'] ?? 3600000);
    void runIngestionWorker();
    setInterval(() => { void runIngestionWorker(); }, interval);
    console.log(`[ingest] Ingestion worker started every ${interval / 60000} minutes`);
}