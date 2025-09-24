import { Forward } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";

export default function CTABanner() {
  return (
    <div className="relative px-6">
      <div className="relative overflow-hidden my-20 w-full dark bg-primary text-foreground max-w-screen-lg mx-auto rounded-2xl py-10 md:py-16 px-6 md:px-14">
        
      <Image
  src="/globe.svg"
  alt="Background Globe"
  fill
  className="object-fit opacity-20 pt-4" // Opaklık ayarlandı
  priority
  style={{
    filter: 'brightness(0) invert(1)' // Bu, SVG'yi beyaz yapar
  }}
/>
       
        <div className="relative z-0 flex flex-col gap-3">
          <h3 className="text-3xl md:text-4xl font-semibold">
            Ready to Publish Your Books?
          </h3>
          <p className="mt-2 text-base md:text-lg">
          Are you ready to publish your first book with our modern, innovative BooksHall application? Try it for free and experience the difference — we are sure you will love it!
          </p>
        </div>
        <div className="relative z-0 mt-8 flex flex-col sm:flex-row gap-4">
          
          <Link href="/signin">
            <Button size="lg" variant="outline">
              Publish first book for free <Forward className="!h-5 !w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}