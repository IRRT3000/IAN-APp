import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook de insets seguro y multiplataforma (iOS & Android).
 * Spec 009: Adaptación Ergonómica Mobile-First.
 * 
 * Garantiza pisos mínimos contra Dynamic Island, muescas, cámaras perforadas
 * y barras de navegación por gestos en iOS y Android.
 */
export function useSafeInsets() {
  let rawInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  
  try {
    const insets = useSafeAreaInsets();
    if (insets) {
      rawInsets = insets;
    }
  } catch (error) {
    // Fallback defensivo si el componente se renderiza fuera de SafeAreaProvider
  }

  const isAndroid = Platform.OS === 'android';

  const androidStatusBarHeight = StatusBar.currentHeight || 28;
  const top = Math.max(
    rawInsets.top || 0,
    isAndroid ? androidStatusBarHeight : (rawInsets.top > 0 ? rawInsets.top : 20)
  );

  const bottom = Math.max(
    rawInsets.bottom || 0,
    isAndroid ? 12 : 20
  );

  const left = rawInsets.left || 0;
  const right = rawInsets.right || 0;

  return {
    top,
    bottom,
    left,
    right,
    headerPaddingTop: top + 10,
    bottomBarClearance: bottom + 70,
    raw: rawInsets,
  };
}
