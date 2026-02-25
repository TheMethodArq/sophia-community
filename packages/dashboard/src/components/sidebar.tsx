"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: "~" },
  { href: "/builds", label: "Builds", icon: "⚡" },
  { href: "/escalations", label: "Escalations", icon: "!" },
  { href: "/tokens", label: "Tokens", icon: "$" },
  { href: "/sessions", label: "Sessions", icon: ">" },
  { href: "/claims", label: "Claims", icon: "#" },
  { href: "/policies", label: "Policies", icon: "📋" },
  { href: "/memory", label: "Memory", icon: "*" },
  { href: "/health", label: "Health", icon: "+" },
  { href: "/bulletin", label: "Bulletin", icon: "@" },
  { href: "/settings", label: "Settings", icon: "%" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>
          <span>sophia</span>.code
        </h1>
        <p>Governance Dashboard</p>
      </div>
      <nav>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : ""}
          >
            <span className="mono" style={{ width: "1rem", textAlign: "center" }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
