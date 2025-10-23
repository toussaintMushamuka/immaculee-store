import { useEffect } from "react";

/**
 * Hook pour synchroniser automatiquement les données entre les pages
 * Recharge les données quand on revient sur une page (après navigation)
 */
export function useDataSync(
  reloadFunction: () => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const handleFocus = () => {
      // Recharger les données quand on revient sur la page
      reloadFunction();
    };

    const handleVisibilityChange = () => {
      // Recharger les données quand la page devient visible
      if (!document.hidden) {
        reloadFunction();
      }
    };

    // Écouter les événements de focus et de visibilité
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Nettoyer les écouteurs
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, dependencies);
}

/**
 * Hook pour recharger automatiquement les produits
 * Utile pour les pages qui dépendent du stock des produits
 */
export function useProductSync(reloadProducts: () => void) {
  useDataSync(reloadProducts, []);
}

