"use client";

import { useEffect, useState } from "react";

/**
 * ClientOnly wrapper - empêche les hydration mismatch
 * Attend que le composant soit monté côté client avant de le rendre
 */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}
