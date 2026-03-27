"use client";

import { useState, useEffect } from "react";

export default function ConnectivityDot() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        online ? "bg-green-500" : "bg-red-500"
      }`}
      title={online ? "Online" : "Offline — changes saved locally"}
    />
  );
}
