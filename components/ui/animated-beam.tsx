// components/ui/animated-beam.tsx
"use client";

import { motion } from "framer-motion";
import { RefObject, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  delay?: number;
  duration?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = Math.random() * 3 + 4,
  delay = 0,
  pathColor = "gray",
  pathWidth = 2,
  pathOpacity = 0.2,
  gradientStartColor = "#ffaa40",
  gradientStopColor = "#9c40ff",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
}) => {
  const id = useId();
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // Determine gradient direction based on reverse prop or relative position
  const gradientCoordinates = reverse
    ? { x1: ["90%", "-10%"], x2: ["100%", "0%"] }
    : { x1: ["10%", "110%"], x2: ["0%", "100%"] };

  useEffect(() => {
    const updatePath = () => {
      // Detailed ref validation
      if (!containerRef) console.warn("AnimatedBeam: containerRef is undefined");
      if (!fromRef) console.warn("AnimatedBeam: fromRef is undefined");
      if (!toRef) console.warn("AnimatedBeam: toRef is undefined");
      if (!containerRef?.current) console.warn("AnimatedBeam: containerRef.current is null");
      if (!fromRef?.current) console.warn("AnimatedBeam: fromRef.current is null");
      if (!toRef?.current) console.warn("AnimatedBeam: toRef.current is null");

      if (!containerRef?.current || !fromRef?.current || !toRef?.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const rectA = fromRef.current.getBoundingClientRect();
      const rectB = toRef.current.getBoundingClientRect();

      // Set fallback dimensions
      const width = containerRect.width || 100;
      const height = containerRect.height || 100;
      setSvgDimensions({ width, height });

      const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
      const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
      const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
      const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

      // Adjust curvature based on relative position (left or right)
      const isRight = endX > startX;
      const controlY = startY + (isRight ? -curvature : curvature);
      const d = `M ${startX},${startY} Q ${(startX + endX) / 2},${controlY} ${endX},${endY}`;
      setPathD(d);
    };

    // Retry mechanism for delayed DOM mounting
    const retryUpdate = () => {
      updatePath();
      if (!pathD) {
        console.warn("AnimatedBeam: Path not set, retrying...");
        requestAnimationFrame(retryUpdate);
      }
    };

    const rafId = requestAnimationFrame(retryUpdate);
    const resizeObserver = new ResizeObserver(updatePath);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updatePath);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePath);
    };
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
    pathD
  ]);

  console.log("AnimatedBeam: pathD:", pathD);
  console.log("AnimatedBeam: svgDimensions:", svgDimensions);

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "pointer-events-none absolute left-0 top-0 transform-gpu z-0",
        className
      )}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      {pathD && (
        <>
          <path
            d={pathD}
            stroke={pathColor}
            strokeWidth={pathWidth}
            strokeOpacity={pathOpacity}
            strokeLinecap="round"
          />
          <path
            d={pathD}
            strokeWidth={pathWidth}
            stroke={`url(#${id})`}
            strokeOpacity="1"
            strokeLinecap="round"
          />
        </>
      )}
      <defs>
        <motion.linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
          animate={{
            x1: gradientCoordinates.x1,
            x2: gradientCoordinates.x2,
            y1: ["0%", "0%"],
            y2: ["0%", "0%"],
          }}
          transition={{
            delay,
            duration,
            ease: [0.16, 1, 0.3, 1],
            repeat: Infinity,
          }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};