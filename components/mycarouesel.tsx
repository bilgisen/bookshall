"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-autoplay";
import Image from "next/image";

export function MyCarousel() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true },
    [
      AutoScroll({
        playOnInit: true,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        delay: 3000, // 3 seconds between scrolls
        jump: false, // Smooth scrolling between slides
      }),
    ]
  );

  const slides = [
    {
      image: "https://image.eventmice.com/upload-1752465246573.webp",
    },
    {
      image: "https://image.eventmice.com/upload-1752465145327.webp",
    },
    {
      image: "https://image.eventmice.com/upload-1752465246573.webp",
    },
    {
      image: "https://image.eventmice.com/upload-1752465145327.webp",
    },
  ];

  return (
    <div className="w-full overflow-hidden py-6">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {slides.map((slide, index) => (
            <div
              key={index}
              className="embla__slide relative h-96 w-full flex-[0_0_100%] md:flex-[0_0_50%] min-w-0"
            >
              <Image
                src={slide.image}
                alt={`Slide ${index + 1}`}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MyCarousel;