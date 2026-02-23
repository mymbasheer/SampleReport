import { useLocalSearchParams } from "expo-router";
import { DocumentDetailScreen } from "@/components/DocumentDetailScreen";

export default function SupplierDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  return <DocumentDetailScreen id={id} name={name || "Supplier"} type="supplier" />;
}
