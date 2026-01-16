import React from "react";
import Navbar from "./Navbar";
import SidebarLeft from "./SidebarLeft";
import SidebarRight from "./SidebarRight";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1250px] mx-auto flex h-[calc(100vh-64px)] overflow-hidden">
        <SidebarLeft />

        <main className="flex-1 border-x border-secondary-100 overflow-y-auto no-scrollbar bg-white">
          {children}
        </main>

        <SidebarRight />
      </div>
    </div>
  );
}
