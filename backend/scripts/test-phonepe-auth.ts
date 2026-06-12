import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.PHONEPE_CLIENT_ID!;
const clientSecret = process.env.PHONEPE_CLIENT_SECRET!;
const clientVersion = process.env.PHONEPE_CLIENT_VERSION || '1';

async function testOAuth(label: string, baseUrl: string) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    client_version: clientVersion,
    grant_type: 'client_credentials',
  });
  const res = await fetch(`${baseUrl}/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  const text = await res.text();
  console.log(`\n[${label}] ${baseUrl}`);
  console.log(`Status: ${res.status}`);
  console.log(`Body: ${text.slice(0, 600)}`);
}

async function testSdk() {
  const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = await import(
    '@phonepe-pg/pg-sdk-node'
  );

  for (const [label, phonePeEnv] of [
    ['SANDBOX', Env.SANDBOX],
    ['PRODUCTION', Env.PRODUCTION],
  ] as const) {
    try {
      const client = StandardCheckoutClient.getInstance(
        clientId,
        clientSecret,
        parseInt(clientVersion, 10),
        phonePeEnv
      );
      const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(`TEST_${Date.now()}`)
        .amount(10000)
        .redirectUrl('http://localhost:4001/payment-success.html')
        .build();
      const response = await client.pay(request);
      console.log(`\n[SDK ${label}] SUCCESS`, response.redirectUrl?.slice(0, 80));
      break;
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; httpStatusCode?: number; data?: unknown };
      console.log(`\n[SDK ${label}] FAILED`, {
        message: e.message,
        code: e.code,
        httpStatusCode: e.httpStatusCode,
        data: e.data,
      });
    }
  }
}

async function main() {
  console.log('Client ID prefix:', clientId?.slice(0, 6) + '...');
  console.log('Client version:', clientVersion);

  await testOAuth('SDK sandbox OAuth host', 'https://api-preprod.phonepe.com/apis/pg-sandbox');
  await testOAuth('Production identity OAuth', 'https://api.phonepe.com/apis/identity-manager');
  await testOAuth('Production pg-sandbox', 'https://api.phonepe.com/apis/pg-sandbox');

  for (const ver of ['1', '2', '3']) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      client_version: ver,
      grant_type: 'client_credentials',
    });
    const res = await fetch('https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    console.log(`\n[Version ${ver}] OAuth status: ${res.status}`);
    if (res.ok) {
      const json = await res.json();
      console.log('Token received, expires_in:', json.expires_in);
    } else {
      console.log(await res.text());
    }
  }

  await testSdk();
}

main().catch(console.error);
