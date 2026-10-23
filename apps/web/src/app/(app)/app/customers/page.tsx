import { Contact } from "lucide-react";
import type { Metadata } from "next";
import { ModuleEmpty } from "@/components/app/module-empty";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <ModuleEmpty
      title="Customers"
      description="The people who email you, with their ticket history."
      icon={Contact}
      emptyTitle="No customers yet"
      emptyDescription="Customers are created automatically from the emails Mailnitio processes."
    />
  );
}
