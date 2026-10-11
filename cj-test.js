// OffTheBlock x CJdropshipping — connection test only.
// Keeps CJ credentials on the server. Does NOT create orders or charge payments.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: 'Use GET for this test endpoint.' });
  }

  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      message: 'Missing CJ_API_KEY. Add it in Vercel → Project Settings → Environment Variables, then redeploy.'
    });
  }

  try {
    const authResponse = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      }
    );

    const auth = await authResponse.json().catch(() => ({}));
    const accessToken = auth && auth.data && auth.data.accessToken;

    if (!authResponse.ok || auth.code !== 200 || !accessToken) {
      console.error('CJ authentication failed:', auth.code, auth.message, auth.requestId);
      return res.status(502).json({
        ok: false,
        step: 'authentication',
        message: 'CJ did not authorize the API key. Check that the key is correct and active in CJ.',
        cjCode: auth.code || null,
        requestId: auth.requestId || null
      });
    }

    // Lightweight read-only request to confirm the access token works.
    const testResponse = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/getCategory',
      { headers: { 'CJ-Access-Token': accessToken } }
    );
    const result = await testResponse.json().catch(() => ({}));

    if (!testResponse.ok || result.code !== 200) {
      console.error('CJ category test failed:', result.code, result.message, result.requestId);
      return res.status(502).json({
        ok: false,
        step: 'api-test',
        message: 'The key was accepted, but the read-only category request failed.',
        cjCode: result.code || null,
        requestId: result.requestId || null
      });
    }

    const categories = Array.isArray(result.data) ? result.data.length : null;
    return res.status(200).json({
      ok: true,
      message: 'OffTheBlock can authenticate with CJdropshipping.',
      test: 'Read-only category request successful.',
      topLevelCategoriesReturned: categories
    });
  } catch (error) {
    console.error('CJ connection test error:', error && error.message);
    return res.status(502).json({
      ok: false,
      message: 'Could not reach CJ from the Vercel function. Check the deployment logs.'
    });
  }
};
