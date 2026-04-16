import { publish } from '../queue/producer.js';
import type { TLEPayload } from '../types/types.js';

const SPACETRACK_LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
const SPACETRACK_TLE_BASE_URL =
  'https://www.space-track.org/basicspacedata/query/class/gp/NORAD_CAT_ID';

const CATALOG_IDS = [
  // Payloads
  // ISS (ZARYA)
  '25544',
  // HST
  '20580',
  // Terra
  '25994',
  // NOAA 20
  '43013',
  // Landsat 8
  '39084',
  // GOES 16
  '41866',
  // GOES 18
  '51850',
  // Sentinel-2A
  '40697',
  // CSS Tianhe
  '48274',
  // Galileo-FM2
  '37847',
  // BeiDou 1
  '26599',
  // Iridium 5
  '24795',
  // OneWeb-0012
  '44057',
  // Viasat-1
  '37843',
  // WorldView-1
  '32060',
  // RADARSAT
  '23710',
  // Elektro-L
  '37344',
  // DirecTV 12
  '36131',
  // Sirius FM-5
  '35493',
  // XM-3
  '28626',
  // Starlink-1012
  '44718',
  // Himawari 8
  '40267',

  // Rocket Bodies
  // Ariane 40 R/B
  '22830',
  // Falcon 9 R/B
  '37253',

  // Debris
  // Delta 1 Deb
  '37762',
];

// function to login to Space-Track
async function login(): Promise<string> {
  const user = process.env['SPACETRACK_USER'];
  const password = process.env['SPACETRACK_PASSWORD'];
  if (!user || !password) {
    throw new Error('SPACETRACK_USER and SPACETRACK_PASSWORD are required');
  }

  const response = await fetch(SPACETRACK_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `identity=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}`,
  });

  if (!response.ok) {
    throw new Error('Space-Track login failed');
  }

  const rawCookie = response.headers.get('Set-Cookie');
  if (!rawCookie) {
    throw new Error('No session cookies received from Space-Track');
  }

  // Set-Cookie format is "name=value; attr; attr..."; take only the credential pair
  return rawCookie.split(';')[0]!;
}

// function to fetch TLEs from Space-Track
async function fetchTLEs(cookie: string): Promise<TLEPayload[]> {
  const ids = CATALOG_IDS.join(',');
  const response = await fetch(`${SPACETRACK_TLE_BASE_URL}/${ids}/format/3le`, {
    headers: { Cookie: cookie },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TLE from Space-Track (HTTP ${response.status})`);
  }

  const lines = (await response.text())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const payloads: TLEPayload[] = [];
  for (let i = 0; i < lines.length; i += 3) {
    // 3LE format prefixes the name line with "0 " which must be stripped
    const name = lines[i]?.replace(/^0\s+/, '');
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (name && line1 && line2) {
      payloads.push({ name, line1, line2 });
    }
  }
  return payloads;
}

// function to run the ingestion worker
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

// function to start the ingestion worker
export function startIngestionWorker(): void {
  if (!process.env['INGEST_INTERVAL_MS']) {
    console.warn('[ingest] INGEST_INTERVAL_MS not set — defaulting to 60 minutes');
  }
  const interval = Number(process.env['INGEST_INTERVAL_MS'] ?? 3600000);
  void runIngestionWorker();
  // run the ingestion worker every interval to get new TLEs
  setInterval(() => {
    void runIngestionWorker();
  }, interval);
  console.log(`[ingest] Ingestion worker started every ${interval / 60000} minutes`);
}
