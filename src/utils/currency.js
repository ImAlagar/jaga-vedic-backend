export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  KRW: "₩",
  RUB: "₽",
  TRY: "₺",
  ZAR: "R",
  SGD: "S$",
  AED: "AED",
  SAR: "SAR",
};

export function getCurrencyDetails(currencyCode = "USD") {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || "";
  return { symbol, code: currencyCode };
}
