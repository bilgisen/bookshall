"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type LanguageCode = 'en' | 'tr' | 'de' | 'es' | 'fr';

const helpContent: Record<LanguageCode, { title: string; content: string }> = {
  en: {
    title: "Help",
    content: `In this section, where you enter and edit your book's metadata, you must fill in the 'Title', 'Author' and 'Publisher' fields. You should also add your book's cover image.

This information is embedded in your digital book and is used by book distributors and reading applications. We recommend filling in all the fields.

**The cost of creating a book is 300 credits.**`
  },
  tr: {
    title: "Yardım",
    content: `Kitabınızın metadata bilgilerini girdiğiniz ve düzenlediğiniz bu bölümde "Başlık", "Yazar" ve "Yayınevi" alanlarını doldurmanız gereklidir. Lütfen kitabınızın kapak görselini de ekleyin.

Bu bölümde girdiğiniz bilgiler dijital kitabınızın içine gömülür; kitap dağıtımcıları ve kitap okuma uygulamaları bu bilgileri kullanır. Alanları doldurmanızı tavsiye ederiz.

**Kitap oluşturmanın maliyeti 300 kredidir.**`
  },
  de: {
    title: "Hilfe",
    content: `In diesem Abschnitt, in dem Sie die Metadaten Ihres Buches eingeben und bearbeiten, müssen Sie die Felder „Titel“, „Autor“ und „Verlag“ ausfüllen. Außerdem sollten Sie das Coverbild Ihres Buches hinzufügen.

Diese Informationen werden in Ihr digitales Buch eingebettet und von Buchhändlern und Leseanwendungen verwendet. Wir empfehlen, alle Felder auszufüllen.

**Die Kosten für die Erstellung eines Buches betragen 300 Credits.**`
  },
  es: {
    title: "Ayuda",
    content: `En esta sección, donde introduces y editas los metadatos de tu libro, debes rellenar los campos «Título», «Autor» y «Editorial». También debes añadir la imagen de la portada de tu libro.

Esta información se incrusta en tu libro digital y es utilizada por los distribuidores de libros y las aplicaciones de lectura. Te recomendamos que rellenes todos los campos.

**El coste de crear un libro es de 300 créditos.**`
  },
  fr: {
    title: "Aide",
    content: `Dans cette section, où vous saisissez et modifiez les métadonnées de votre livre, vous devez remplir les champs « Titre », « Auteur » et « Éditeur ». Vous devez également ajouter l'image de couverture de votre livre.

Ces informations sont intégrées à votre livre numérique et sont utilisées par les distributeurs de livres et les applications de lecture. Nous vous recommandons de remplir tous les champs.

**Le coût de création d'un livre est de 300 crédits.**`
  }
};

export function BooksHelp() {
  const [activeTab, setActiveTab] = React.useState<LanguageCode>('en');

  return (
    <div className="rounded-lg border p-4 bg-muted/20">
      <Tabs 
        defaultValue="en" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value as LanguageCode)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            <span>{helpContent[activeTab].title}</span>
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
          {helpContent[activeTab].content}
        </div>
      </Tabs>
    </div>
  );
}

export function InlineBooksHelp({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = React.useState<LanguageCode>('en');
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={cn("text-sm", className)}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
        <span className="text-xs">Help</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 p-3 bg-muted/20 rounded-md">
          <Tabs 
            defaultValue="en" 
            className="w-full"
            onValueChange={(value) => setActiveTab(value as LanguageCode)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium">{helpContent[activeTab].title}</span>
              <TabsList className="h-7">
                <TabsTrigger value="en" className="text-[10px] h-5 px-1.5">EN</TabsTrigger>
                <TabsTrigger value="tr" className="text-[10px] h-5 px-1.5">TR</TabsTrigger>
                <TabsTrigger value="de" className="text-[10px] h-5 px-1.5">DE</TabsTrigger>
                <TabsTrigger value="es" className="text-[10px] h-5 px-1.5">ES</TabsTrigger>
                <TabsTrigger value="fr" className="text-[10px] h-5 px-1.5">FR</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="text-xs text-muted-foreground whitespace-pre-line">
              {helpContent[activeTab].content}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}