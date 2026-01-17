export const BASE_CURRENCY = "RUB" as const;
// 1 USD = 75 RUB
export const USD_TO_RUB_RATE = 75;

export const PAYMENT_METHODS = ["sbp", "card", "crypto", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_DETAILS = {
  crypto: {
    networks: {
      ERC20: "0x7628267db0cba86297910fd75d91cf4f0bf2c5bb",
      TRC20: "TU22xAVauNPds3PxakjV97BJySJ8pKm1yG",
    },
  },
  sbp: {
    recipient: "-",
    bank: "-",
    phone: "-",
    purpose: "-",
  },
  card: {
    recipient: "-",
    bank: "-",
    cardLast4: "-",
  },
  other: {
    notes: "-",
  },
} as const;
