const API_URL = process.env.API_URL || 'http://localhost:3000/graphql';
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

async function waitForApi(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });

      if (res.ok) {
        console.log(`\n✓ API is reachable at ${API_URL}`);
        return;
      }
    } catch {
      // API not ready yet
    }

    if (attempt < MAX_RETRIES) {
      console.log(`Waiting for API... (attempt ${attempt}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  throw new Error(
    `\n✗ API not reachable at ${API_URL} after ${MAX_RETRIES} attempts.\n` +
      `  Make sure the API is running (docker-compose up) before running tests.`,
  );
}

export default waitForApi;
