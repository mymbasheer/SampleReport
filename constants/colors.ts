const tint = "#0D7377";
const tintDark = "#14919B";

const Colors = {
  light: {
    text: "#1A1D26",
    textSecondary: "#6B7280",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    tint,
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tint,
    accent: "#D4A843",
    positive: "#10B981",
    negative: "#EF4444",
    warning: "#F59E0B",
    border: "#E5E7EB",
    cardShadow: "rgba(0,0,0,0.06)",
    supplierAccent: "#3B82F6",
    // Stock status backgrounds
    stockInBg: "#E0F7F7",
    stockLowBg: "#FFFBEB",
    stockOutBg: "#FEF2F2",
    // Chip backgrounds
    chipCustomer: "#FEF2F2",
    chipSupplier: "#EFF6FF",
  },
  dark: {
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    background: "#0F172A",
    surface: "#1E293B",
    tint: tintDark,
    tabIconDefault: "#475569",
    tabIconSelected: tintDark,
    accent: "#D4A843",
    positive: "#10B981",
    negative: "#EF4444",
    warning: "#F59E0B",
    border: "#334155",
    cardShadow: "rgba(0,0,0,0.4)",
    supplierAccent: "#60A5FA",
    // Stock status backgrounds (dark)
    stockInBg: "#0D3B3C",
    stockLowBg: "#2D2208",
    stockOutBg: "#2D1515",
    // Chip backgrounds
    chipCustomer: "#2D1515",
    chipSupplier: "#172554",
  },
};

export default Colors;
