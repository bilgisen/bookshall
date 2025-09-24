// components/landing/why-choose-us.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const features = [
  {
    title: "Your books, your freedom!",
    details:
      "With BooksHall, you are the sole owner of your digital library. Effortlessly prepare your digital books, download them and sell them on any platform you choose. Avoid paying unnecessary commissions to intermediaries or being tied to a single platform.",
    image: "https://storage.bookshall.com/upload-1758643930972.jpg"
  },
  {
    title: "Powerful technology and a clean interface.",
    details:
      "BooksHall's backend is fully compliant with industry standards. The management panel, on the other hand, is extremely simple and user-friendly. Edit your content with our advanced text editor, arrange sections using drag-and-drop functionality and publish your book with a single click.",
    image: "https://storage.bookshall.com/upload-1758643943340.jpg"
  },
  {
    title: "It is fully compliant with global publishing standards.",
    details:
      "You can sell the books you produce via the BooksHall through all major distribution channels, including Amazon, Apple Books, Google Books, Kobo, Barnes & Noble Nook, Audible and Storytel, without any problems. Our books are also seamlessly integrated with all reading apps.",
    image: "https://storage.bookshall.com/upload-1758680908541.jpg"
  },
  {
    title: "Transparent and affordable pricing",
    details:
      "With BooksHall, you can produce books at a lower cost than the retail price of one book. You only pay for what you use. Choose one of our advantageous subscription packages or purchase credits as and when you need them. We offer cutting-edge technology at highly competitive prices.",
    image: "https://storage.bookshall.com/upload-1758681828248.jpeg"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const
    }
  }
};

const WhyChooseUs = () => {
  return (
    <div className="w-full py-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Why choose us?
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mt-6 rounded-full" />
        </motion.div>

        <motion.div 
          className="space-y-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex flex-col md:flex-col lg:flex-row items-center gap-8 lg:gap-16"
              variants={itemVariants}
            >
              <div className={`flex-1 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="p-1 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20">
                  <div className="rounded-xl overflow-hidden">
                    <Image 
                      src={feature.image} 
                      alt={feature.title}
                      width={600}
                      height={400}
                      className="w-full h-auto object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
              
              <div className={`flex-1 max-w-lg ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-2xl md:text-3xl font-bold mb-6 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {feature.details}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default WhyChooseUs;