"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    section: "Getting Started & Core Features",
    items: [
      {
        q: "What is BooksHall?",
        a: "BooksHall is a modern, AI-powered platform designed to help authors, publishers, and content creators effortlessly prepare and publish digital content. Our tools streamline the entire process, allowing you to produce professional-grade digital books and documents in multiple formats from a single source.",
      },
      {
        q: "Why should I choose BooksHall?",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Intuitive Interface:</strong> A user-friendly dashboard that makes content management simple.</li>
            <li><strong>AI-Powered Efficiency:</strong> Intelligent tools that accelerate the creation and formatting process.</li>
            <li><strong>High-Quality Outputs:</strong> Generate flawless, professional-grade files ready for any platform.</li>
            <li><strong>Affordable Pricing:</strong> A transparent, credit-based model that offers exceptional value.</li>
          </ul>
        ),
      },
      {
        q: "Do you offer a free trial?",
        a: "Yes! When you sign up for a new BooksHall account, you receive a welcome bonus of 1,000 credits. This is more than enough to create and publish your first full project. You can also earn extra credits by referring friends.",
      },
      {
        q: "What formats can I produce with BooksHall?",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li>ePub (for all ebook retailers)</li>
            <li>PDF (for print-on-demand and direct sales)</li>
            <li>HTML (for web-based versions)</li>
            <li>Audiobooks (AI-narrated or from your own audio files)</li>
          </ul>
        ),
      },
    ],
  },
  {
    section: "Publishing & Distribution",
    items: [
      {
        q: "Are the ebooks created with BooksHall compatible with major retail platforms?",
        a: "Absolutely. The files you generate are optimized for Amazon KDP, Apple Books, Google Play Books, Kobo, Storytel, Audify, and many more.",
      },
      {
        q: "Does BooksHall distribute my books for me?",
        a: "No. BooksHall focuses on providing you with world-class, ready-to-publish files. You have full freedom to upload and sell your books wherever you choose.",
      },
    ],
  },
  {
    section: "Pricing & Account",
    items: [
      {
        q: "How does your pricing work?",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Subscription-Based:</strong> Monthly or annual plans.</li>
            <li><strong>Monthly Credits:</strong> Each plan includes credits for publishing tasks.</li>
            <li><strong>Rollover Credits:</strong> Unused credits carry over.</li>
            <li><strong>Top-Up:</strong> Purchase additional credit packs anytime.</li>
          </ul>
        ),
      },
    ],
  },
  {
    section: "Security & Support",
    items: [
      {
        q: "Who owns the rights to my content?",
        a: "You do. You retain 100% ownership of your content. BooksHall never claims rights over your work.",
      },
      {
        q: "What kind of customer support do you offer?",
        a: "Our Help Center offers tutorials and guides. All users have access to email support, while premium users may receive priority support.",
      },
    ],
  },
];

const FAQ = () => {
  return (
    <section className="w-full py-20 px-6 lg:px-16 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-5xl mx-auto">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-4xl lg:text-5xl font-bold tracking-tight text-center mb-12"
        >
          Frequently Asked <span className="text-primary">Questions</span>
        </motion.h2>

        {/* FAQ Sections */}
        <div className="space-y-12 max-w-3xl mx-auto">
          {faqs.map((section, idx) => (
            <motion.div
              key={section.section}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <Accordion
                type="single"
                collapsible
                className="w-full rounded-2xl border bg-card/50 backdrop-blur-sm shadow-md"
              >
                {section.items.map((item, i) => (
                  <AccordionItem key={i} value={`${section.section}-${i}`}>
                    <AccordionTrigger className="text-left text-lg font-medium px-4 py-3">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-muted-foreground text-base">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
