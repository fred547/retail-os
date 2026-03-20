import PortalLoginForm from "@/components/PortalLoginForm";

export default function ManagerLoginPage() {
  return (
    <PortalLoginForm
      portal="manager"
      title="Account Manager Login"
      subtitle="Posterita staff portal for account oversight and support."
      redirectPath="/manager/platform"
      alternateHref="/customer/login"
      alternateLabel="Business owner? Use the customer portal."
    />
  );
}
