export type CartItem = {
  eventId: string;
  ticketId: string;
  ticketName: string;
  qty: number;
  unitPrice: number;
  createdAt: number;
};

const CART_KEY = "eventboard.cart";

export function setCart(cart: CartItem) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function getCart(): CartItem | null {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CartItem;
  } catch {
    return null;
  }
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}
