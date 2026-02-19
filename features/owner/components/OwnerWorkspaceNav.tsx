import Link from "next/link";

type OwnerWorkspaceNavProps = {
  current: "dashboard" | "offers" | "inventory" | "new-listing";
};

export default function OwnerWorkspaceNav({ current }: OwnerWorkspaceNavProps) {
  const baseClass = "rounded border px-3 py-2 text-sm";
  const activeClass = "border-zinc-900 bg-zinc-900 text-white";
  const inactiveClass = "border-zinc-300 text-zinc-800";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className={`${baseClass} ${current === "dashboard" ? activeClass : inactiveClass}`} href="/dashboard">
        Dashboard
      </Link>
      <Link className={`${baseClass} ${current === "offers" ? activeClass : inactiveClass}`} href="/offers">
        Offers
      </Link>
      <Link className={`${baseClass} ${current === "inventory" ? activeClass : inactiveClass}`} href="/inventory">
        Inventory
      </Link>
      <Link className={`${baseClass} ${current === "new-listing" ? activeClass : inactiveClass}`} href="/listings/new">
        Add listing
      </Link>
    </div>
  );
}
