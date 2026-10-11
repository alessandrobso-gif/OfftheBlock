
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

    return res.status(200).json({
      ok: true,
      keyword,
      page,
      total: result?.data?.totalRecords ?? products.length,
      products: products.map((p) => ({
        id: p.id,
        name: p.nameEn,
        sku: p.sku,
        image: p.bigImage,
        priceUSD: p.nowPrice || p.sellPrice,
        category: p.threeCategoryName || "",
        inventory: p.warehouseInventoryNum ?? null
      }))
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      message: "Error al consultar el catálogo de CJ."
    });
  }
};
