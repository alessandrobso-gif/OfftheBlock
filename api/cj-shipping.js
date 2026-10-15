
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Usa GET para consultar el envío."
    });
  }

  const vid = String(req.query.vid || "").trim();
  const country = String(req.query.country || "PE")
    .trim()
    .toUpperCase();

  const apiKey = process.env.CJ_API_KEY;
  const usdToPEN = 3.60;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Falta configurar CJ_API_KEY."
    });
  }

  if (!vid || !/^[A-Za-z0-9-]{1,100}$/.test(vid)) {
    return res.status(400).json({
      ok: false,
      error: "Falta un ID de variante válido (vid)."
    });
  }

  if (!/^[A-Z]{2}$/.test(country)) {
    return res.status(400).json({
      ok: false,
      error: "Código de país inválido."
    });
  }

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

    if (!authResponse.ok || !token) {
      return res.status(502).json({
        ok: false,
        error: "No se pudo autenticar con CJ."
      });
    }

    const freightResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate",
      {
        method: "POST",
        headers: {
          "CJ-Access-Token": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startCountryCode: "CN",
          endCountryCode: country,
          products: [
            {
              quantity: 1,
              vid: vid
            }
          ]
        })
      }
    );

    const freight = await freightResponse.json();

    if (
      !freightResponse.ok ||
      freight.code !== 200 ||
      !Array.isArray(freight.data)
    ) {
      return res.status(502).json({
        ok: false,
        error: "CJ no pudo calcular el envío.",
        message: freight.message || "Sin detalles"
      });
    }

    const options = freight.data.map(function (item) {
      const shippingUSD = Number(item.totalPostageFee != null
        ? item.totalPostageFee
        : item.logisticPrice);

      const validPrice =
        Number.isFinite(shippingUSD) && shippingUSD >= 0;

      return {
        method: item.logisticName || "Transporte CJ",
        days: item.logisticAging || null,
        shippingUSD: validPrice ? shippingUSD : null,
        shippingPEN: validPrice
          ? Math.ceil(shippingUSD * usdToPEN * 100) / 100
          : null,
        currency: "PEN"
      };
    });

    return res.status(200).json({
      ok: true,
      country: country,
      currency: "PEN",
      usdToPEN: usdToPEN,
      origin: "CN",
      options: options,
      note: "Tarifas estimadas. Confirma el coste final antes de cobrar."
    });

  } catch (error) {
    console.error("Error calculando envío CJ:", error);

    return res.status(500).json({
      ok: false,
      error: "Error al consultar las tarifas de envío."
    });
  }
};
