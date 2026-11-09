import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import { cyberAudio } from "@/lib/audio";
import { Volume2, VolumeX } from "lucide-react";

export interface MusicStreamLineProps {
  color?: string;
}

export const MusicStreamLine = ({ color }: MusicStreamLineProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!barsRef.current) return;
    const bars = Array.from(barsRef.current.children);
    gsap.killTweensOf(bars);

    bars.forEach((bar, index) => {
      if (isPlaying) {
        const randomDuration = 0.25 + Math.random() * 0.25;
        const randomDelay = index * 0.08;
        const randomScale = 1.8 + Math.random() * 2.2;
        gsap.to(bar, {
          scaleY: randomScale,
          duration: randomDuration,
          delay: randomDelay,
          yoyo: true,
          repeat: -1,
          ease: "power1.inOut",
        });
      } else {
        gsap.to(bar, {
          scaleY: 0.35,
          duration: 0.2,
          ease: "power2.out",
        });
      }
    });
  }, [isPlaying]);

  const toggleSound = () => {
    const isNowActive = !isPlaying;
    setIsPlaying(isNowActive);
    if (isNowActive) {
      cyberAudio.startAmbient();
      cyberAudio.playClick(1050, 0.08);
    } else {
      cyberAudio.stopAmbient();
      cyberAudio.playClick(440, 0.06);
    }
  };

  return (
    <button
      onClick={toggleSound}
      className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-[#303743] hover:border-[#416F9E] dark:hover:border-[#648DBB] transition-colors group cursor-pointer shadow-sm"
      title={isPlaying ? "Mute Cyber Telemetry" : "Activate Cyber Telemetry Sound"}
    >
      {/* Animated Sound Equalizer Bars */}
      <div
        ref={barsRef}
        className="flex items-center gap-[2.5px] h-3.5 w-5 justify-center"
      >
        <span className="w-[2.5px] h-full bg-[#416F9E] dark:bg-[#648DBB] rounded-full origin-bottom" />
        <span className="w-[2.5px] h-full bg-[#337D5C] dark:bg-[#4D9B78] rounded-full origin-bottom" />
        <span className="w-[2.5px] h-full bg-[#416F9E] dark:bg-[#648DBB] rounded-full origin-bottom" />
        <span className="w-[2.5px] h-full bg-sky-400 rounded-full origin-bottom" />
      </div>

      <span className="text-[10px] font-mono tracking-wider text-slate-600 dark:text-slate-300">
        {isPlaying ? "SYNTH" : "MUTED"}
      </span>

      {isPlaying ? (
        <Volume2 className="w-3.5 h-3.5 text-[#416F9E] dark:text-[#648DBB] animate-pulse" />
      ) : (
        <VolumeX className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
      )}
    </button>
  );
};

export default MusicStreamLine;
