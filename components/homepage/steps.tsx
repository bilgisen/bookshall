"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Package, CaseUpper, Paintbrush, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Package,
    title: "Enter Your Book Information",
    description:
      "Start by entering your book's core information, such as the title, author, publisher, description, and upload your book's cover.",
  },
  {
    icon: CaseUpper,
    title: "Add Your Chapter Content",
    description:
      "Use our powerful rich text editor to create your book chapters. Easily add images. Arrange your chapter order and hierarchy with a simple drag-and-drop feature.",
  },
  {
    icon: Paintbrush,
    title: "Choose Your Publishing Options",
    description:
      "Select your desired output format from EPUB, PDF, HTML, or audiobook. Complete any final additions then launch the publishing process with a single click.",
  },
  {
    icon: Check,
    title: "Your Book is Ready!",
    description:
      "Your book is now ready to be shared with the world. Publish it to your favorite platforms or download the files for distribution.",
  },
];

export default function StepsSection() {
  return (
    <section className="w-full bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl font-bold mb-8"
          >
            Gain Ease and Speed in Your Publishing Process
          </motion.h2>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="flex items-start gap-4"
              >
                <Card className="p-3 rounded-full bg-primary/50 dark:bg-primary/50">
                  <step.icon className="w-6 h-6 text-white/80" />
                </Card>
                <CardContent className="p-0">
                  <h3 className="font-semibold text-xl">{step.title}</h3>
                  <p className="text-muted-foreground text-m">{step.description}</p>
                </CardContent>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative h-full w-full min-h-[500px] lg:min-h-0 overflow-hidden rounded-xl"
        >
          <Image
            src="https://storage.bookshall.com/upload-1757284377758.webp"
            alt="Publishing process illustration"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </motion.div>
      </div>
    </section>
  );
}