import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const ScrollIndicator = () => {
  const [isScrolling, setIsScrolling] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useGSAP(() => {
    if (!dotRef.current) return;
    gsap.to(dotRef.current, {
      y: 36,
      duration: 1.2,
      yoyo: true,
      repeat: -1,
      ease: "power2.inOut",
    });
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 transition-opacity duration-500 pointer-events-none select-none ${
        isScrolling ? "opacity-0" : "opacity-90"
      }`}
    >
      {/* Dual Telemetry Track with moving cyber reticle */}
      <div className="relative w-7 h-14 flex justify-between px-1.5 items-center">
        {/* Left Track */}
        <div className="w-[1px] h-full bg-gradient-to-b from-[#00F2FE]/40 via-[#00F2FE] to-transparent" />
        
        {/* Animated Reticle Dot */}
        <div
          ref={dotRef}
          className="absolute left-1/2 -translate-x-1/2 top-1 w-2.5 h-2.5 rounded-full bg-[#00F2FE] shadow-[0_0_12px_#00F2FE]"
        />

        {/* Right Track */}
        <div className="w-[1px] h-full bg-gradient-to-b from-[#00F2FE]/40 via-[#00F2FE] to-transparent" />
      </div>

      <div className="flex items-center gap-1 font-mono text-[10px] tracking-[0.25em] text-[#00F2FE]/80 uppercase">
        <span>SCROLL TO TRACE</span>
        <ChevronDown className="w-3 h-3 text-[#00F2FE] animate-bounce" />
      </div>
    </div>
  );
};

export default ScrollIndicator;
