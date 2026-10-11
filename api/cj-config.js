
const CONFIG = {
  currency: "PEN",

  // Margen de ganancia real sobre el precio de venta.
  // 0.30 = 30%, 0.40 = 40%, 0.50 = 50%.
  margin: 0.30,

  // Gastos adicionales por producto, expresados en soles.
  extraCostsPEN: 0,

  // Tipo de cambio configurable: soles por dólar.
  // Actualízalo según el tipo de cambio que realmente pagues.
  usdToPEN: 3.60
};

module.exports = function (req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end(JSON.stringify({
      ok: false,
      message: "Método no permitido"
    }));
  }

  const margin = Number(CONFIG.margin);
  const usdToPEN = Number(CONFIG.usdToPEN);
  const extraCostsPEN = Number(CONFIG.extraCostsPEN);

  if (
    !Number.isFinite(margin) || margin < 0 || margin >= 1 ||
    !Number.isFinite(usdToPEN) || usdToPEN <= 0 ||
    !Number.isFinite(extraCostsPEN) || extraCostsPEN < 0
  ) {
    res.statusCode = 500;
    return res.end(JSON.stringify({
      ok: false,
      message: "Revisa la configuración de precios"
    }));
  }

  res.statusCode = 200;
  return res.end(JSON.stringify({
    ok: true,
    currency: CONFIG.currency,
    margin,
    usdToPEN,
    extraCostsPEN,
    formula: "precio = costo total / (1 - margen)",
    note: "El envío debe calcularse por producto y destino antes de obtener el precio final."
  }));
};
