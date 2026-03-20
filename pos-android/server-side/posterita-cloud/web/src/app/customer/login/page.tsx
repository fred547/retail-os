import PortalLoginForm from "@/components/PortalLoginForm";

export default function CustomerLoginPage() {
  return (
    <PortalLoginForm
      portal="customer"
      title="Customer Login"
      subtitle="Manage your Posterita business account, products, stores, and reports."
      redirectPath="/customer"
      alternateHref="/manager/login"
      alternateLabel="Posterita team? Use the account manager portal."
    />
  );
}
