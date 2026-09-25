import type { AnchorHTMLAttributes } from 'react';

// Existing storefront routes belong to their original export. Use document
// navigation so this isolated editorial build never replaces their runtime.
export default function DocumentLink({ href = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const target = href.startsWith('/') && !href.startsWith('/varathans25/')
    ? `/varathans25${href}` : href;
  return <a {...props} href={target} />;
}
