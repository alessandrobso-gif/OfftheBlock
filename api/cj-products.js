
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      message: "Usa GET para buscar productos."
    });
  }

  const apiKey = process.env.CJ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      message: "Falta configurar CJ_API_KEY en Vercel."
    });
  }

  const keyword = String(req.query.keyword || "hoodie")
    .trim()
    .slice(0, 80);

  const page = Math.max(
    1,
    Math.min(1000, Number(req.query.page) || 1)
  );

  try {
    const configResponse = await fetch(
  `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/cj-config`
);

    if (!configResponse.ok) {
      throw new Error("No se pudo cargar la configuración de precios.");
    }

    const config = await configResponse.json();

    if (
      !config.ok ||
      !Number.isFinite(Number(config.margin)) ||
      Number(config.margin) < 0 ||
      Number(config.margin) >= 1 ||
      !Number.isFinite(Number(config.usdToPEN)) ||
      Number(config.usdToPEN) <= 0 ||
      !Number.isFinite(Number(config.extraCostsPEN)) ||
      Number(config.extraCostsPEN) < 0
    ) {
      throw new Error("Configuración de precios inválida.");
    }

    const authResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ apiKey })
      }
    );

    const auth = await authResponse.json();
    const token = auth?.data?.accessToken;

    if (!authResponse.ok || auth.code !== 200 || !token) {
      return res.status(502).json({
        ok: false,
        message: "CJ no autorizó la conexión."
      });
    }

    const params = new URLSearchParams({
      page: String(page),
      size: "10",
      keyWord: keyword
    });

    const productResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" +
        params.toString(),
      {
        headers: {
          "CJ-Access-Token": token
        }
      }
    );

    const result = await productResponse.json();

    if (!productResponse.ok || result.code !== 200) {
      return res.status(502).json({
        ok: false,
        message: "CJ no pudo devolver los productos."
      });
    }

    const content = result?.data?.content || [];
    const products = content.flatMap(
      (group) => group.productList || []
    );

    const margin = Number(config.margin);
    const usdToPEN = Number(config.usdToPEN);
    const extraCostsPEN = Number(config.extraCostsPEN);

    return res.status(200).json({
      ok: true,
      keyword,
      page,
      total: result?.data?.totalRecords ?? products.length,
      currency: "PEN",
      margin,
      usdToPEN,
      shippingIncluded: false,
      priceNote: "Precio referencial sin envío internacional ni posibles impuestos.",
      products: products.map((p) => {
        const rawPrice = Number(p.nowPrice || p.sellPrice);
        const validCost = Number.isFinite(rawPrice) && rawPrice > 0;

        const costPEN = validCost
          ? rawPrice * usdToPEN + extraCostsPEN
          : null;

        const pricePEN = costPEN !== null
          ? Math.ceil((costPEN / (1 - margin)) * 100) / 100
          : null;

        return {
          id: p.id,
          name: p.nameEn,
          sku: p.sku,
          image: p.bigImage,
          priceUSD: validCost ? rawPrice : null,
          costPEN: costPEN !== null
            ? Math.round(costPEN * 100) / 100
            : null,
          pricePEN,
          priceType: "referencial_sin_envio",
          category: p.threeCategoryName || "",
          inventory: p.warehouseInventoryNum ?? null
        };
      })
    });
} catch (error) {
  console.error("Error en catálogo CJ:", error);
  return res.status(502).json({
    ok: false,
    message: error.message || "Error desconocido"
  });
}
};

