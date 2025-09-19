"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const guides = {
  en: {
    title: "BooksHall User Guide",
    steps: [
      {
        title: "Step 1: Create a Book",
        content:
          `Click "Create New Book". Fill in title, author, publisher (required). Info is embedded in e-book. Add a cover for best results.`,
      },
      {
        title: "Step 2: Add Chapters",
        content:
          `Use the smart editor to write chapters. Chapters can be hierarchical. Reorder via drag-and-drop or select parent chapter.`,
      },
      {
        title: "Step 3: Publish Your Book",
        content:
          `Publish as ePub (standard format). Options: include metadata, cover, and table of contents. Generated with Pandoc.`,
      },
    ],
    pricing: [
      "200 credits: create a new book project",
      "50 credits: add a chapter",
      "200 credits: each ePub/PDF publish",
    ],
    help: "BooksHall assistant (bottom-right) is ready to help. Contact: bookshallcom@Gmail.com",
  },
  de: {
    title: "Anleitung für BooksHall",
    steps: [
      {
        title: "Schritt 1: Ein Buch erstellen",
        content:
          `Klicken Sie auf "Create New Book". Titel, Autor, Verlag sind Pflicht. Infos werden eingebettet. Cover wird empfohlen.`,
      },
      {
        title: "Schritt 2: Kapitel hinzufügen",
        content:
          `Kapitel über den Editor verfassen. Reihenfolge per Drag-and-drop oder übergeordnetes Kapitel anpassen.`,
      },
      {
        title: "Schritt 3: Ihr Buch veröffentlichen",
        content:
          `ePub-Format veröffentlichen. Optionen: Metadaten, Cover, Inhaltsverzeichnis. Erzeugt mit Pandoc.`,
      },
    ],
    pricing: [
      "200 Credits: neues Buchprojekt",
      "50 Credits: pro Kapitel",
      "200 Credits: pro ePub/PDF Veröffentlichung",
    ],
    help: "BooksHall-Assistent (unten rechts) hilft. Kontakt: bookshallcom@Gmail.com",
  },
  fr: {
    title: "Guide d'utilisation de BooksHall",
    steps: [
      {
        title: "Étape 1 : Créer un livre",
        content:
          `Cliquez sur « Create New Book ». Remplissez Titre, Auteur, Éditeur. Infos intégrées dans l'e-book. Ajoutez une couverture.`,
      },
      {
        title: "Étape 2 : Ajouter des chapitres",
        content:
          `Rédigez vos chapitres avec l’éditeur. Réorganisez via glisser-déposer ou parent chapter.`,
      },
      {
        title: "Étape 3 : Publier votre livre",
        content:
          `Publiez en ePub. Options : inclure métadonnées, couverture, table des matières. Généré avec Pandoc.`,
      },
    ],
    pricing: [
      "200 crédits : nouveau projet",
      "50 crédits : par chapitre",
      "200 crédits : chaque publication ePub/PDF",
    ],
    help: "Assistant BooksHall (coin inférieur droit). Contact: bookshallcom@Gmail.com",
  },
  es: {
    title: "Guía del usuario de BooksHall",
    steps: [
      {
        title: "Paso 1: Crear un libro",
        content:
          `Haga clic en "Create New Book". Complete Título, Autor, Editorial. Info incrustada. Añada portada.`,
      },
      {
        title: "Paso 2: Añadir capítulos",
        content:
          `Use el editor para escribir capítulos. Reordene con arrastrar y soltar o elija capítulo padre.`,
      },
      {
        title: "Paso 3: Publicar su libro",
        content:
          `Publique en ePub. Opciones: incluir metadatos, portada, tabla de contenidos. Procesado con Pandoc.`,
      },
    ],
    pricing: [
      "200 créditos: nuevo proyecto",
      "50 créditos: cada capítulo",
      "200 créditos: cada publicación ePub/PDF",
    ],
    help: "Asistente BooksHall (abajo derecha). Contacto: bookshallcom@Gmail.com",
  },
  zh: {
    title: "BooksHall 用户指南",
    steps: [
      {
        title: "第一步：创建一本书",
        content:
          `点击 “Create New Book”。填写标题、作者、出版商。信息会嵌入电子书。建议添加封面。`,
      },
      {
        title: "第二步：添加章节",
        content:
          `用编辑器编写章节。章节可层级化。可拖拽排序或选择父章节。`,
      },
      {
        title: "第三步：发布您的书",
        content:
          `发布 ePub 格式。选项：包含元数据、封面、目录。由 Pandoc 生成。`,
      },
    ],
    pricing: [
      "200 积分：新书项目",
      "50 积分：每章",
      "200 积分：每次 ePub/PDF 发布",
    ],
    help: "BooksHall 助手（右下角）随时帮助您。联系: bookshallcom@Gmail.com",
  },
  tr: {
    title: "BooksHall Kullanım Rehberi",
    steps: [
      {
        title: "1. Adım: Bir Kitap Oluşturun",
        content:
          `"Create New Book" butonuna tıklayın. Başlık, yazar, yayınevi zorunlu. Bilgiler e-kitaba gömülür. Kapak ekleyin.`,
      },
      {
        title: "2. Adım: Bölümleri Ekleyin",
        content:
          `Akıllı editörle bölümleri yazın. Sürükle-bırak veya parent chapter ile düzenleyin.`,
      },
      {
        title: "3. Adım: Kitabınızı Yayınlayın",
        content:
          `ePub formatında yayınlayın. Seçenekler: metadata, kapak, içindekiler. Pandoc ile üretilir.`,
      },
    ],
    pricing: [
      "200 kredi: yeni kitap",
      "50 kredi: her bölüm",
      "200 kredi: her ePub/PDF",
    ],
    help: "BooksHall asistanı (sağ alt). İletişim: bookshallcom@Gmail.com",
  },
};

export default function UserGuide() {
  return (
    <div className="max-w-4xl mx-auto">
      <Tabs defaultValue="en">
        <TabsList className="w-full grid grid-cols-6 mb-8 bg-background">
          <TabsTrigger value="en">EN</TabsTrigger>
          <TabsTrigger value="de">DE</TabsTrigger>
          <TabsTrigger value="fr">FR</TabsTrigger>
          <TabsTrigger value="es">ES</TabsTrigger>
          <TabsTrigger value="zh">中文</TabsTrigger>
          <TabsTrigger value="tr">TR</TabsTrigger>
        </TabsList>

        {Object.entries(guides).map(([lang, guide]) => (
          <TabsContent key={lang} value={lang} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                {guide.steps.map((s, i) => (
                  <div key={i} className="group flex items-start gap-3">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-medium mt-0.5 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-medium">{s.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{s.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <h3 className="font-medium mb-3">Pricing / Credits</h3>
                <ul className="space-y-2 text-sm">
                  {guide.pricing.map((p, i) => (
                    <li key={i} className="flex items-start">
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <h3 className="font-medium mb-2">Need help?</h3>
                <p className="text-sm text-muted-foreground">{guide.help}</p>
              </div>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
