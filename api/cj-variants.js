
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido"
    });
  }

  const pid = String(req.query.pid || "").trim();
  const apiKey = process.env.CJ_API_KEY;

  if (!pid) {
    return res.status(400).json({
      ok: false,
      error: "Falta el ID del producto (pid)"
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Falta configurar CJ_API_KEY en Vercel"
    });
  }

  try {
    // Obtener token de acceso de CJ
    const authResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: apiKey
        })
      }
    );

    const auth = await authResponse.json();

    if (
      !authResponse.ok ||
      auth.result === false ||
      !auth.data ||
      !auth.data.accessToken
    ) {
      console.error("Error de autenticación CJ:", auth.message);

      return res.status(502).json({
        ok: false,
        error: "No se pudo autenticar con CJdropshipping"
      });
    }

    const token = auth.data.accessToken;

    // Consultar todas las variantes del producto
    const detailResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/productDetail/query",
      {
        method: "POST",
        headers: {
          "CJ-Access-Token": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: pid
        })
      }
    );

    const detail = await detailResponse.json();

    if (
      !detailResponse.ok ||
      detail.result === false ||
      !detail.data
    ) {
      console.error("Error de variantes CJ:", detail.message);

      return res.status(502).json({
        ok: false,
        error: "CJ no pudo devolver las variantes del producto"
      });
    }

    const data = detail.data;
    const variantes = Array.isArray(data.variants)
      ? data.variants
      : [];

    const USD_TO_PEN = 3.60;
    const MARGIN = 0.35;

    const products = variantes.map(function (v) {
      const priceUSD = Number(v.variantSellPrice);
      const validPrice =
        Number.isFinite(priceUSD) && priceUSD > 0;

      const costPEN = validPrice
        ? Math.ceil(priceUSD * USD_TO_PEN * 100) / 100
        : null;

      const pricePEN = validPrice
        ? Math.ceil((priceUSD * USD_TO_PEN / (1 - MARGIN)) * 100) / 100
        : null;

      return {
        id: v.vid || "",
        sku: v.variantSku || "",
        options: v.variantKey || v.variantNameEn || "",
        image: v.variantImage || "",
        priceUSD: validPrice ? priceUSD : null,
        costPEN: costPEN,
        pricePEN: pricePEN,
        currency: "PEN",
        priceType: "referencial_sin_envio",
        shippingIncluded: false
      };
    });

    return res.status(200).json({
      ok: true,
      pid: pid,
      name: data.nameEn || data.nameen || "",
      currency: "PEN",
      margin: MARGIN,
      usdToPEN: USD_TO_PEN,
      shippingIncluded: false,
      variants: products
    });
  } catch (error) {
    console.error("Error en cj-variants:", error);

    return res.status(500).json({
      ok: false,
      error: "Error al consultar las variantes de CJ"
    });
  }
};
