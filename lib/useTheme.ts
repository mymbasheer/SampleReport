import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";

/**
 * Returns the correct color palette based on the device color scheme.
 * Use this everywhere instead of hardcoding `Colors.light`.
 *
 * Example:
 *   const C = useTheme();
 *   <Text style={{ color: C.text }}>Hello</Text>
 */
export function useTheme() {
  const scheme = useColorScheme();
  return scheme === "dark" ? Colors.dark : Colors.light;
}

/** Returns "dark" | "light" */
export function useColorMode() {
  return useColorScheme() ?? "light";
}

import { Platform } from "react-native";

/**
 * Returns the extra top padding needed for web to account for the
 * fixed header bar. Eliminates the `webTopInset = Platform.OS === "web" ? 67 : 0`
 * magic number repeated across every screen.
 */
export function useWebTopInset(): number {
  return Platform.OS === "web" ? 67 : 0;
}

export function useWebBottomInset(): number {
  return Platform.OS === "web" ? 34 : 0;
}