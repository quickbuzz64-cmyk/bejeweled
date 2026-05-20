export interface NavigationLink {
  to: string;
  label: string;
  matchMode?: 'exact' | 'prefix';
}

export const mainNavigationLinks: NavigationLink[] = [
  { to: '/shop', label: 'Shop', matchMode: 'prefix' },
  { to: '/about', label: 'About', matchMode: 'exact' },
  { to: '/contact', label: 'Contact', matchMode: 'exact' },
  { to: '/faq', label: 'FAQ', matchMode: 'exact' },
];

export const utilityNavigationLinks: NavigationLink[] = [
  { to: '/wishlist', label: 'Wishlist', matchMode: 'exact' },
  { to: '/dashboard', label: 'My Account', matchMode: 'prefix' },
];

export const footerNavigationSections = [
  {
    title: 'Shop',
    links: [
      { to: '/shop', label: 'All Products' },
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/cart', label: 'Cart' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/contact', label: 'Contact Us' },
      { to: '/faq', label: 'FAQ' },
      { to: '/dashboard', label: 'Track Orders' },
    ],
  },
  {
    title: 'About Bejeweled',
    links: [
      { to: '/about', label: 'Our Story' },
      { to: '/terms', label: 'Terms & Conditions' },
      { to: '/privacy', label: 'Privacy Policy' },
    ],
  },
];

export function isNavigationLinkActive(pathname: string, link: NavigationLink) {
  if (link.to === '/') {
    return pathname === '/';
  }

  if (link.matchMode === 'prefix') {
    return pathname === link.to || pathname.startsWith(`${link.to}/`);
  }

  return pathname === link.to;
}