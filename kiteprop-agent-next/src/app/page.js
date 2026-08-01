"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatView from "@/components/ChatView";
import DashboardView from "@/components/DashboardView";
import PropertiesView from "@/components/PropertiesView";

export default function Page() {
  const [activeView, setActiveView] = useState("chat");

  return (
    <div className="app">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <main className="main">
        <ChatView active={activeView === "chat"} />
        <DashboardView active={activeView === "dashboard"} />
        <PropertiesView active={activeView === "properties"} />
      </main>
    </div>
  );
}
