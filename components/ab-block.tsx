"use client";

import React, { forwardRef, useRef, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";

interface CircleProps {
  className?: string;
  src: string;
  alt: string;
  size?: number;
}

const Circle = forwardRef<HTMLDivElement, CircleProps>(
  ({ className, src, alt, size = 48 }, ref) => {
    const containerSize = size + 12;
    const imageSize = size - 4;

    return (
      <div
        ref={ref}
        className={cn(
          "z-10 flex items-center justify-center rounded-full border-2 bg-white shadow-md overflow-hidden",
          className
        )}
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={imageSize}
          height={imageSize}
          className="object-contain"
          style={{
            width: `${imageSize}px`,
            height: `${imageSize}px`,
          }}
          priority
        />
      </div>
    );
  }
);

Circle.displayName = "Circle";

export default function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Left logos
  const div1 = useRef<HTMLDivElement>(null);
  const div2 = useRef<HTMLDivElement>(null);
  const div3 = useRef<HTMLDivElement>(null);

  // Center logo
  const centerRef = useRef<HTMLDivElement>(null);

  // Right logos
  const div4 = useRef<HTMLDivElement>(null);
  const div5 = useRef<HTMLDivElement>(null);
  const div6 = useRef<HTMLDivElement>(null);

  // Only render beams when all refs are available
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sideRefs = useMemo(() => [div1, div2, div3, div4, div5, div6], []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[400px] w-full md:max-w-2xl sm:max-w-[360px] mx-auto items-center justify-center overflow-hidden px-4"
    >
      <div className="flex items-center justify-between w-full max-w-[90%] mx-auto">
        {/* Left side logos */}
        <div className="flex flex-col items-center gap-6">
          <Circle ref={div1} src="/kobo.svg" alt="Kobo" size={48} />
          <Circle ref={div2} src="/amazon.svg" alt="Amazon" size={48} />
          <Circle ref={div3} src="/apple.svg" alt="Apple" size={48} />
        </div>

        {/* Center icon */}
        <div
          className="z-20 flex items-center justify-center rounded-full w-24 h-24 sm:w-24 sm:h-24 border bg-background backdrop-blur-sm shadow-lg"
          ref={centerRef}
        >
          <Image
            src="/bookshall-icon.svg"
            alt="Bookshall"
            width={56}
            height={56}
            className="object-contain"
          />
        </div>

        {/* Right side logos */}
        <div className="flex flex-col items-center gap-6">
          <Circle ref={div4} src="/google.svg" alt="Google" size={48} />
          <Circle ref={div5} src="/bn.svg" alt="Barnes & Noble" size={48} />
          <Circle ref={div6} src="/nook.svg" alt="Nook" size={48} />
        </div>
      </div>

      {/* Beams behind everything */}
      <div className="absolute inset-0 z-0">
        {isMounted && sideRefs.map((ref, idx) => {
          // Skip rendering if any ref is not available
          if (!ref.current || !centerRef.current || !containerRef.current) {
            return null;
          }
          
          return (
            <AnimatedBeam
              key={idx}
              containerRef={containerRef}
              fromRef={centerRef}
              toRef={ref}
              curvature={idx < 3 ? 30 : -30}
              startYOffset={0}
              endYOffset={0}
              reverse={false}
            />
          );
        })}
      </div>
    </div>
  );
}
