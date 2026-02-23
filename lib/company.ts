import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "./query-client";

export interface CompanyInfo {
  name: string;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  streetName?: string | null;
  region?: string | null;
}

export function useCompany() {
  return useQuery<CompanyInfo>({
    queryKey: ["/api/company"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: Infinity, // Company info rarely changes mid-session
  });
}

/** Build a formatted address string from company info */
export function formatCompanyAddress(company: CompanyInfo): string {
  const parts = [
    company.streetName || company.address,
    company.city,
    company.region,
    company.postalCode,
  ].filter(Boolean);
  return parts.join(", ");
}
