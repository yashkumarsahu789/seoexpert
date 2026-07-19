/** Sunlu promo demo — reference: gummysearchpromocodes.webflow.io */

export const SUNLU_PROMO = {
  brand: 'Sunlu',
  siteName: 'Sunlu Promo Codes',
  promoCode: 'KANNY',
  discount: '10%',
  discountLabel: '10% OFF',
  tagline: 'Flat 10% discount on your products',
  shopUrl: import.meta.env.VITE_SHOP_BASE_URL || 'https://shop.LifeSolveNow.com',
  liveWebflowUrl: import.meta.env.VITE_WEBFLOW_LIVE_URL || 'https://sunlu-promo-hub.webflow.io',
  hostedPromoUrl:
    import.meta.env.VITE_SUNLU_PROMO_URL ||
    `${(import.meta.env.VITE_COUPON_SITES_PUBLIC_BASE || 'https://shop.LifeSolveNow.com/coupon-sites').replace(/\/$/, '')}/sunlu-kanny-promo.html`,
  cmsSlug: 'sunlu-kanny-promo',
  referenceUrl: 'https://gummysearchpromocodes.webflow.io/',
  year: new Date().getFullYear(),
}

export const SUNLU_NAV = [
  { id: 'home', label: 'Home' },
  { id: 'why', label: 'Why Sunlu' },
  { id: 'review', label: 'Products' },
  { id: 'how', label: 'How to Use Code' },
  { id: 'faq', label: 'FAQ' },
]

export const SUNLU_BENEFITS = [
  { title: 'Instant savings', text: 'Apply code KANNY at checkout and get 10% off on your entire order.' },
  { title: 'Quality products', text: 'Sunlu delivers reliable 3D printing filaments and accessories trusted by makers.' },
  { title: 'Easy checkout', text: 'Copy the code, paste at payment — discount applies automatically on eligible items.' },
  { title: 'Limited-time value', text: 'Exclusive promo for shoppers landing from search — save more on every purchase.' },
  { title: 'Fast shipping', text: 'Order with confidence — popular SKUs ship quickly from verified sellers.' },
  { title: 'Support ready', text: 'Questions about your order or code? Our team helps you complete purchase smoothly.' },
]

export const SUNLU_STEPS = [
  { step: '1', title: 'Visit the shop', text: 'Open the official Sunlu product store using the button below.' },
  { step: '2', title: 'Add products to cart', text: 'Pick filaments, resins, or accessories you want to buy.' },
  { step: '3', title: 'Enter promo code KANNY', text: 'At checkout, paste KANNY in the coupon field to unlock 10% off.' },
  { step: '4', title: 'Complete purchase', text: 'Confirm your order and enjoy discounted Sunlu products.' },
]

export const SUNLU_FAQ = [
  {
    q: 'What is the Sunlu promo code KANNY?',
    a: 'KANNY is an exclusive coupon code that gives you 10% discount on Sunlu products at checkout.',
  },
  {
    q: 'How do I use code KANNY?',
    a: 'Add items to cart, go to checkout, enter KANNY in the promo/coupon box, and apply before payment.',
  },
  {
    q: 'Does KANNY work on all products?',
    a: 'KANNY applies to eligible Sunlu products in your cart. Some bundled or already-discounted items may be excluded.',
  },
  {
    q: 'Can I combine KANNY with other offers?',
    a: 'Usually one promo code per order. Use KANNY for the best available stackable discount shown at checkout.',
  },
  {
    q: 'Is this the official Sunlu website?',
    a: 'This is a promo landing page that directs you to shop with code KANNY. Always verify the final store URL before paying.',
  },
]
