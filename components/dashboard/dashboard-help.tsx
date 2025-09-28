"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle } from "lucide-react";

type LanguageCode = 'en' | 'tr' | 'de' | 'es' | 'fr';

const helpContent = {
  en: {
    title: "Help",
    content: `**How to use it?**

1. Click the "Create New Book" button to create a book.
2. Click the "Add Chapter" link to add chapters to your book. If you wish, you can change the order of the chapters you have added on the "Chapters" page.
3. Once your book is ready for printing, send it to print from the "Publish" page. Currently, only the ePub option is active. Other printing options will be available soon.

**What is the cost of creating a digital book?**
- You will spend 300 credits when you create a new book and 200 credits when you publish it as an ePub.

**What should I do if I run out of credits?**
- You can subscribe by clicking the "Upgrade plan" button on this page. Or you can purchase credits as needed.`
  },
  tr: {
    title: "Yardım",
    content: `**Nasıl kullanılır?**

1. "Create New Book" butonunu tıklayarak bir kitap oluşturun.
2. "Add Chapter" linkini tıklayarak kitabınıza bölümler ekleyin. Dilerseniz "Chapters" sayfasından eklediğiniz bölümlerin sıralamasını değiştirebilirsiniz.
3. Kitabınız baskıya hazır hale geldiyse "Publish" sayfasından baskıya verin. Şu an sadece ePub seçeneği aktiftir. Diğer baskı seçenekleri çok yakında.

**Dijital kitap hazırlamanın maliyeti nedir?**
- Yeni bir kitap oluşturduğunuzda 300 kredi ve epub olarak yayınladığınızda 200 kredi harcarsınız.

**Kredim biterse ne yapmalıyım?**
- Bu sayfadaki "Upgrade plan" butonunu tıklayarak abone olabilirsiniz. Ya da ihtiyacınız oranında kredi satın alabilirsiniz.`
  },
  de: {
    title: "Hilfe",
    content: `**Wie wird es verwendet?**

1. Klicken Sie auf die Schaltfläche "Create New Book", um ein Buch zu erstellen.
2. Klicken Sie auf den Link "Add Chapter", um Ihrem Buch Kapitel hinzuzufügen. Wenn Sie möchten, können Sie die Reihenfolge der hinzugefügten Kapitel auf der Seite "Chapters" ändern.
3. Sobald Ihr Buch druckbereit ist, senden Sie es von der Seite "Publish" aus zum Drucken. Derzeit ist nur die ePub-Option aktiv. Weitere Druckoptionen werden in Kürze verfügbar sein.

**Was kostet die Erstellung eines digitalen Buches?**
- Sie verbrauchen 300 Credits, wenn Sie ein neues Buch erstellen, und 200 Credits, wenn Sie es als ePub veröffentlichen.

**Was soll ich tun, wenn mir die Credits ausgehen?**
- Sie können sich über die Schaltfläche "Upgrade plan" auf dieser Seite anmelden. Oder Sie können bei Bedarf Credits kaufen.`
  },
  fr: {
    title: "Aide",
    content: `**Comment l'utiliser ?**

1. Cliquez sur le bouton "Create New Book" pour créer un livre.
2. Cliquez sur le lien "Add Chapter" pour ajouter des chapitres à votre livre. Si vous le souhaitez, vous pouvez modifier l'ordre des chapitres que vous avez ajoutés sur la page "Chapters".
3. Une fois votre livre prêt à être imprimé, envoyez-le à l'impression depuis la page "Publish". Actuellement, seule l'option ePub est active. D'autres options d'impression seront bientôt disponibles.

**Quel est le coût de création d'un livre numérique ?**
- Vous dépenserez 300 crédits lors de la création d'un nouveau livre et 200 crédits lors de sa publication au format ePub.

**Que dois-je faire si je n'ai plus de crédits ?**
- Vous pouvez vous abonner en cliquant sur le bouton "Upgrade plan" sur cette page. Ou vous pouvez acheter des crédits selon vos besoins.`
  },
  es: {
    title: "Ayuda",
    content: `**¿Cómo se usa?**

1. Haz clic en el botón "Create New Book" para crear un libro.
2. Haz clic en el enlace "Add Chapter" para agregar capítulos a tu libro. Si lo deseas, puedes cambiar el orden de los capítulos que has añadido en la página "Chapters".
3. Una vez que tu libro esté listo para imprimir, envíalo a imprimir desde la página "Publish". Actualmente, solo la opción ePub está activa. Otras opciones de impresión estarán disponibles pronto.

**¿Cuál es el costo de crear un libro digital?**
- Gastarás 300 créditos al crear un nuevo libro y 200 créditos al publicarlo como ePub.

**¿Qué debo hacer si me quedo sin créditos?**
- Puedes suscribirte haciendo clic en el botón "Upgrade plan" en esta página. O puedes comprar créditos según sea necesario.`
  }
} as const;

type Language = keyof typeof helpContent;

export function DashboardHelp() {
  const [activeTab, setActiveTab] = React.useState<Language>('en');
  const content = helpContent[activeTab];

  return (
    <div className="rounded-lg border p-4 bg-muted/20">
      <Tabs 
        defaultValue="en" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value as Language)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HelpCircle className="h-4 w-4" />
            <span>{content.title}</span>
          </div>
          <TabsList className="h-8">
            <TabsTrigger value="en" className="text-xs h-6">EN</TabsTrigger>
            <TabsTrigger value="tr" className="text-xs h-6">TR</TabsTrigger>
            <TabsTrigger value="de" className="text-xs h-6">DE</TabsTrigger>
            <TabsTrigger value="es" className="text-xs h-6">ES</TabsTrigger>
            <TabsTrigger value="fr" className="text-xs h-6">FR</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="whitespace-pre-line text-sm text-muted-foreground">
          {content.content}
        </div>
      </Tabs>
    </div>
  );
}

export default DashboardHelp;
