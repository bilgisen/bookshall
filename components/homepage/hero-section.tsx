'use client';

import React from 'react';
import { LetterGlitchBackground } from '@/components/ui/shadcn-io/letter-glitch-background';
import { Button } from '@/components/ui/button';

import { Logo } from '@/components/navbar-04/logo';
import { NavMenu } from '@/components/navbar-04/nav-menu';
import { NavigationSheet } from '@/components/navbar-04/navigation-sheet';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative w-full h-screen flex flex-col overflow-hidden bg-white dark:bg-black">
      {/* Navbar */}
      <nav className="fixed top-4 inset-x-6 h-14  backdrop-blur-xl bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 shadow-lg max-w-screen-sm mx-auto rounded-full z-50">
        <div className="h-full flex items-center justify-between mx-auto px-4">
          <Logo />

          {/* Desktop Menu */}
          <NavMenu className="hidden md:block" />

          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button
                variant="outline"
                className="hidden sm:inline-flex rounded-full"
              >
                Sign In
              </Button>
            </Link>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <NavigationSheet />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Body */}
      <div className="relative flex-1 flex items-center justify-center">
        {/* Glitch arka plan */}
        <LetterGlitchBackground
          className="absolute inset-0"
          glitchColors={["#2b4539", "#61dca3", "#61b3dc"]}
          glitchSpeed={70}
          outerVignette
          smooth
        />

        {/* İçerik */}
        <div className="relative z-10 text-center px-6 max-w-5xl">
          {/* Badge */}
          <div className="inline-block px-3 py-2 mt-8 rounded-full bg-gray-200 dark:bg-gray-800 text-md font-medium text-gray-700 dark:text-gray-300">
            Powered by AI
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground/80 my-4">
            Go Digital, Go Simple: <br />
            <span className="text-foreground">Publish Your Digital Books Easily</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
            Transform your book into a stunning digital version with our intuitive platform. 
            Publishers and authors enjoy a fast, seamless process that delivers a flawless reader experience.
          </p>

          {/* CTA Button */}
          <Link href="/sign-in">
            <Button size="lg" className="rounded-2xl px-6 py-3 text-lg shadow-lg">
              Create a book for free
            </Button>
          </Link>
        </div>

        {/* Gradient Overlay (dark/light uyumlu kontrast için) */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 dark:from-black/70 to-transparent" />
      </div>
    </section>
  );
}
