import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Layout wrapper kept for API compatibility with the pages.
 * Content renders statically: no scroll-triggered motion on this site.
 */
export default function Reveal({ children, className = '' }: RevealProps) {
  return <div className={className}>{children}</div>;
}
