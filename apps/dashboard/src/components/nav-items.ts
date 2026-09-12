export interface NavItem {
  href: string;
  key:
    | "dashboard" | "owner_command_center" | "opportunities" | "suppliers" | "fleet"
    | "rfqs" | "quotes" | "negotiations" | "inspections" | "purchases" | "payments"
    | "donor_trucks" | "dismantling" | "packing" | "logistics" | "shipments" | "customs"
    | "receiving" | "warehouse" | "inventory" | "claims" | "analytics" | "reports"
    | "settings" | "audit_log" | "assistant";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", key: "dashboard" },
  { href: "/owner", key: "owner_command_center" },
  { href: "/opportunities", key: "opportunities" },
  { href: "/suppliers", key: "suppliers" },
  { href: "/fleet", key: "fleet" },
  { href: "/rfqs", key: "rfqs" },
  { href: "/quotes", key: "quotes" },
  { href: "/negotiations", key: "negotiations" },
  { href: "/inspections", key: "inspections" },
  { href: "/purchases", key: "purchases" },
  { href: "/payments", key: "payments" },
  { href: "/donor-trucks", key: "donor_trucks" },
  { href: "/dismantling", key: "dismantling" },
  { href: "/packing", key: "packing" },
  { href: "/logistics", key: "logistics" },
  { href: "/shipments", key: "shipments" },
  { href: "/customs", key: "customs" },
  { href: "/receiving", key: "receiving" },
  { href: "/warehouse", key: "warehouse" },
  { href: "/inventory", key: "inventory" },
  { href: "/claims", key: "claims" },
  { href: "/analytics", key: "analytics" },
  { href: "/reports", key: "reports" },
  { href: "/assistant", key: "assistant" },
  { href: "/audit-log", key: "audit_log" },
  { href: "/settings", key: "settings" },
];
