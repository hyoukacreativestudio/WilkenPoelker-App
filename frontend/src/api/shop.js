import apiClient, { getServerUrl } from './client';

// Product pages built from the shop's Taifun stock (public, no login needed).
export const shopApi = {
  getProducts: (params) => apiClient.get('/shop/products', { params }),
  getProduct: (slug) => apiClient.get(`/shop/products/${encodeURIComponent(slug)}`),
};

export const shopImageUrl = (u) => (!u ? null : (u.startsWith('http') ? u : `${getServerUrl()}${u}`));

export const SHOP_PHONE = '+4949525304';
export const SHOP_PHONE_LABEL = '04952 / 5304';
export const SHOP_EMAIL = 'verkauf@wilkenpoelker.de';
