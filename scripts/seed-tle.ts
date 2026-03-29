/**
 * Fetches real TLE data for a set of satellites from Celestrak and ingests
 * each one into the Cerebro backend using POST /api/v1/ingest/tle.
 *
 * Usage: npx tsx scripts/seed-tle.ts
 * Requires: backend + RabbitMQ running (docker compose up)
 */

const BACKEND = process.env['BACKEND_URL'];

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

interface TLEPayload {
  name: string;
  line1: string;
  line2: string;
}

async function fetchTLE(catalogId: string): Promise<TLEPayload> {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catalogId}&FORMAT=TLE`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Celestrak returned ${res.status.toString()} for CATNR=${catalogId}`);
  }
  const text = (await res.text()).trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) {
    throw new Error(`Unexpected TLE format for CATNR=${catalogId}: ${text}`);
  }
  return { name: lines[0]!, line1: lines[1]!, line2: lines[2]! };
}

async function ingest(payload: TLEPayload): Promise<void> {
  const res = await fetch(`${BACKEND}/api/v1/ingest/tle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ingest failed (${res.status.toString()}): ${body}`);
  }
}

async function main(): Promise<void> {
  console.log(`Seeding ${CATALOG_IDS.length.toString()} satellites from Celestrak -> ${BACKEND}\n`);

  for (const id of CATALOG_IDS) {
    process.stdout.write(`  Fetching CATNR ${id}... `);
    try {
      const payload = await fetchTLE(id);
      await ingest(payload);
      console.log(`Success: ${payload.name}`);
    } catch (err) {
      console.log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\nDone. Assets will appear on the map in 3 seconds.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
