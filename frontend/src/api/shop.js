import apiClient, { getServerUrl } from './client';

// Product pages built from the shop's Taifun stock (public, no login needed).
export const shopApi = {
  getProducts: (params) => apiClient.get('/shop/products', { params }),
  getProduct: (slug) => apiClient.get(`/shop/products/${encodeURIComponent(slug)}`),
  // Becomes a ticket with chat: Verkauf answers, the customer reads it in the app.
  createInquiry: (data) => apiClient.post('/shop/inquiries/app', data),
};

export const shopImageUrl = (u) => (!u ? null : (u.startsWith('http') ? u : `${getServerUrl()}${u}`));

// Pictures for the chosen variant (bike in another frame shape / colour): its own
// pictures first, then the ones for every variant. Same rule as the backend.
export const imagesForLook = (images, look) => {
  const list = images || [];
  if (!look || !list.some((img) => img.look)) return list;
  const own = list.filter((img) => img.look === look);
  return own.length ? [...own, ...list.filter((img) => !img.look)] : list;
};

export const SHOP_PHONE = '+4949525304';
export const SHOP_PHONE_LABEL = '04952 / 5304';
