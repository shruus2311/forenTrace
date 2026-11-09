import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import { cyberAudio } from "@/lib/audio";
import { Volume2, VolumeX } from "lucide-react";

interface MusicStreamLineProps {
  color?: string;
}

export const MusicStreamLine = ({ color = "text-[#00F2FE]" }: MusicStreamLineProps) => {
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
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#060910] border border-white/[0.08] hover:border-cyan-400/40 transition-colors group cursor-pointer"
      title={isPlaying ? "Mute Cyber Telemetry" : "Activate Cyber Telemetry Sound"}
    >
      {/* Animated Sound Equalizer Bars */}
      <div
        ref={barsRef}
        className="flex items-center gap-[3px] h-3.5 w-6 justify-center"
      >
        <span className="w-[2.5px] h-full bg-[#00F2FE] rounded-full origin-bottom" />
        <span className="w-[2.5px] h-full bg-emerald-400 rounded-full origin-bottom" />
        <span className="w-[2.5px] h-full bg-[#00F2FE] rounded-full origin-bottom" />
        <span className="w-[2.5px] h-full bg-cyan-200 rounded-full origin-bottom" />
      </div>

      <span className={`text-[11px] font-mono tracking-wider ${color}`}>
        {isPlaying ? "AUDIO: SYNTH_ACTIVE" : "AUDIO: MUTED"}
      </span>

      {isPlaying ? (
        <Volume2 className="w-3.5 h-3.5 text-[#00F2FE] animate-pulse" />
      ) : (
        <VolumeX className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
      )}
    </button>
  );
};

export default MusicStreamLine;
