import {
  TailwindCSS,
  BetterAuth,
  Polar,
  NeonPostgres,
  Nextjs,
} from "@/components/logos";
import { Card } from "@/components/ui/card";
import * as React from "react";

export default function Integrations() {
  return (
    <section>
      <div className="pt-0 pb-8">
        <div className="mx-auto max-w-6xl px-6">
     
          <div className="text-center">
          <div className="inline-block px-3 py-2 mt-8 text-xl text-primary">
            Powered by AI
          </div>
            <h2 className="text-balance text-3xl mx-auto font-semibold md:text-5xl">
            Simple yet powerful
            </h2>
            <p className="text-center text-muted-foreground mt-3 text-lg max-w-4xl mx-auto">
            BooksHall is an AI-powered, innovative, simple yet powerful application that allows you to easily prepare your digital book and document content and publish it in ePub, audiobook, PDF, DOC and HTML formats.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {/* First row - 2 columns */}
            <div className="grid gap-4 sm:grid-cols-2">
              <IntegrationCardHorizontal
                title="ePub"
                description="Create dynamic, reflowable digital books perfect for every e-reader. Compatible with global platforms: Amazon, Apple Books, Google Books, Kobo, Barnes & Noble Nook and more"
              >
                <Nextjs />
              </IntegrationCardHorizontal>

              <IntegrationCardHorizontal
                title="Audiobook"
                description="Transform your text into an engaging listen-anywhere audio experience. Compatible with global platforms: Audible, Storytel, Apple Books, Google Play, Kobo, and more"
              >
                <BetterAuth />
              </IntegrationCardHorizontal>
            </div>

            {/* Second row - 3 columns */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <IntegrationCardVertical
                title="PDF"
                description="Generate pixel-perfect, printable PDF documents"
              >
                <NeonPostgres />
              </IntegrationCardVertical>

              <IntegrationCardVertical
                title="HTML"
                description="Publish searchable, web-ready content for any website or browser"
              >
                <Polar />
              </IntegrationCardVertical>

              <IntegrationCardVertical
                title="DOC"
                description="Export easily editable documents, perfect for collaboration and review."
              >
                <TailwindCSS />
              </IntegrationCardVertical>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const IntegrationCardHorizontal = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <Card className="p-12 border bg-transparent">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mr-4 *:size-12">
          {children}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );
};

const IntegrationCardVertical = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <Card className="p-6 border bg-transparent">
      <div className="text-left space-y-4">
        <div className="flex justify-left *:size-10">
          {children}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );
};