import { useLocalSearchParams } from "expo-router";
import { DocumentDetailScreen } from "@/components/DocumentDetailScreen";

export default function CustomerDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  return <DocumentDetailScreen id={id} name={name || "Customer"} type="customer" />;
}
