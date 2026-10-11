
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      message: "Usa GET para esta prueba."
    });
  }

  const apiKey = process.env.CJ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      message: "Falta configurar CJ_API_KEY en Vercel."
    });
  }

  try {
    const response = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey })
      }
    );

    const data = await response.json();
    const token = data?.data?.accessToken;

    if (!response.ok || data.code !== 200 || !token) {
      return res.status(502).json({
        ok: false,
        message: "CJ no autorizó la clave. Revisa la API Key en Vercel.",
        code: data.code || null
      });
    }

    return res.status(200).json({
      ok: true,
      message: "¡OffTheBlock se conectó correctamente con CJ!",
      authenticated: true
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: "No se pudo conectar con CJ."
    });
  }
};
