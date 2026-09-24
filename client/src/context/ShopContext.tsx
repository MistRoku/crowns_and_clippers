import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, currentTenantSlug } from '../lib/api';
import { FALL_SHOP_VIEW, toShopView, type ShopView } from '../data/shop';

interface ShopContextValue {
  shop: ShopView;
  loading: boolean;
}

const ShopContext = createContext<ShopContextValue>({ shop: FALL_SHOP_VIEW, loading: true });

/**
 * Provides the resolved tenant's branding (name, address, phone, hours,
 * offer code...) to the whole app. The tenant itself is resolved server-side
 * from subdomain / X-Tenant-Slug header; the client sends the slug it chose.
 */
export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<ShopView>(FALL_SHOP_VIEW);
  const [loading, setLoading] = useState(true);
  const tenantSlug = currentTenantSlug();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getShopInfo()
      .then((info) => {
        if (!cancelled) setShop(toShopView(info));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  const value = useMemo(() => ({ shop, loading }), [shop, loading]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopView {
  return useContext(ShopContext).shop;
}
