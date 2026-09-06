import { useStore } from "./store";

export function useVendorDesk() {
  const store = useStore();
  const venue = store.venues[0];
  const mine = store.stalls.filter((s) => s.vendorId === store.vendorId);
  const tenancy = mine.find((s) => s.venueId === venue?.id);
  const myDishes = store.dishes.filter((d) => d.stallId === tenancy?.id);
  const tonightDishes = myDishes.filter((d) => d.onTonight);
  const mySales = store.sales.filter((row) => row.stallId === tenancy?.id);
  const tonightYuan = mySales.reduce((sum, row) => sum + row.priceYuan, 0);
  const myOrders = store.orders.filter((row) => row.stallId === tenancy?.id);
  return { ...store, venue, mine, tenancy, myDishes, tonightDishes, mySales, tonightYuan, myOrders };
}
