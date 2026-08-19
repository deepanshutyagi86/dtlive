"use client";
import { useEffect, useState } from "react";
import { SITE_TZ } from "@/lib/dates";

export default function LiveClock() {
  const [time, setTime] = useState<string>("--:--:-- IST");

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour12: false,
          timeZone: SITE_TZ,
        }) + " IST"
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{time}</span>;
}
