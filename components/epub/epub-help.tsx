'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EpubHelp() {
  return (
    <Tabs defaultValue="en" className="w-full mt-6">
      <TabsList className="w-full flex flex-nowrap overflow-x-auto">
        <TabsTrigger value="en" className="px-4">EN</TabsTrigger>
        <TabsTrigger value="tr" className="px-4">TR</TabsTrigger>
        <TabsTrigger value="fr" className="px-4">FR</TabsTrigger>
        <TabsTrigger value="de" className="px-4">DE</TabsTrigger>
        <TabsTrigger value="es" className="px-4">ES</TabsTrigger>
      </TabsList>

      <TabsContent value="en" className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">About ePub generation:</h3>
        <p>ePub production is carried out using the industry-standard Pandoc library.</p>
        
        <h4 className="font-medium mt-4">Options:</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium">Include imprint:</h5>
            <p className="text-sm text-muted-foreground">
              This adds a title page at the beginning of the book containing information such as the title, author, publisher and publication date. It is recommended that this option is selected for most books.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Include cover:</h5>
            <p className="text-sm text-muted-foreground">
              The image that you upload as the book cover will appear in e-book readers and will be generated automatically. If you would prefer the cover image to be displayed as a page within the book, select this option.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Include TOC:</h5>
            <p className="text-sm text-muted-foreground">
              The system generates a table of contents page that is fully compatible with ePub readers. Alternatively, you can add an additional table of contents page at the beginning of the book. In most cases, the integrated table of contents page is sufficient and does not need to be selected.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <h5 className="font-medium">Credits:</h5>
            <p className="text-sm text-muted-foreground">
              Publishing your book as an EPUB file costs 200 credits. If the same book is published multiple times, separate credits are deducted for each transaction.
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="tr" className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">ePub yayınlama hakkında</h3>
        <p>ePub üretimi endüstri standartı Pandoc kütüphanesi tarafından gerçekleştirilmektedir.</p>
        
        <h4 className="font-medium mt-4">Seçenekler hakkında:</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium">Include imprint:</h5>
            <p className="text-sm text-muted-foreground">
              Bu seçenek, kitabın başlangıcına, kitap adı, yazarı, yayınevi, ve yayın tarihi gibi bilgilerin yer aldığı bir künye sayfası ekler. Pek çok kitap için bu seçeneğin işaretlenmesi tavsiye edilir.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Include Cover:</h5>
            <p className="text-sm text-muted-foreground">
              Kitap kapağı olarak yüklediğiniz görsel kitap kapağının ekitap okuyucularda görünmesini sağlar ve otomatik olarak üretilir. Kapak görselini kitabın içinde de bir sayfa olarak göstermeyi tercih ediyorsanız bu seçeneği işaretleyebilirsiniz.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Include TOC:</h5>
            <p className="text-sm text-muted-foreground">
              ePub okuyucularla tam uyumlu içindekiler sayfası sistem tarafından üretilmektedir. Yine tercih ederseniz kitabın başlangıcına ekstra bir içindekiler sayfası ekleyebilirsiniz. Çoğu durumda bütünleşik içindekiler sayfası yeterlidir ve bunu işaretlemeye gerek yoktur.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <h5 className="font-medium">Kredi:</h5>
            <p className="text-sm text-muted-foreground">
              Kitabınızı epub olarak yayınlamanın maliyeti 200 kredidir. Aynı kitabı birden fazla yayına verirseniz her bir işlem için ayrı kredi düşülür.
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="fr" className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">À propos de la génération ePub :</h3>
        <p>La production ePub est réalisée à l&apos;aide de la bibliothèque Pandoc, norme industrielle.</p>
        
        <h4 className="font-medium mt-4">À propos des options :</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium">Inclure l&apos;empreinte :</h5>
            <p className="text-sm text-muted-foreground">
              Cette option ajoute une page de titre au début du livre contenant des informations telles que le titre, l&apos;auteur, l&apos;éditeur et la date de publication. Il est recommandé de sélectionner cette option pour la plupart des livres.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Inclure la couverture :</h5>
            <p className="text-sm text-muted-foreground">
              L&apos;image que vous téléchargez comme couverture du livre apparaîtra dans les liseuses électroniques et sera générée automatiquement. Si vous préférez que l&apos;image de couverture s&apos;affiche comme une page dans le livre, sélectionnez cette option.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Inclure la table des matières :</h5>
            <p className="text-sm text-muted-foreground">
              Le système génère une page de table des matières entièrement compatible avec les liseuses ePub. Vous pouvez également ajouter une page de table des matières supplémentaire au début du livre. Dans la plupart des cas, la page de table des matières intégrée est suffisante et il n&apos;est pas nécessaire de sélectionner cette option.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <h5 className="font-medium">Crédits :</h5>
            <p className="text-sm text-muted-foreground">
              La publication de votre livre au format EPUB coûte 200 crédits. Si le même livre est publié plusieurs fois, des crédits distincts sont déduits pour chaque transaction.
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="de" className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">Über die ePub-Erstellung:</h3>
        <p>Die ePub-Erstellung erfolgt mithilfe der branchenüblichen Pandoc-Bibliothek.</p>
        
        <h4 className="font-medium mt-4">Zu den Optionen:</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium">Impressum einfügen:</h5>
            <p className="text-sm text-muted-foreground">
              Dadurch wird am Anfang des Buches eine Titelseite mit Informationen wie Titel, Autor, Verlag und Erscheinungsdatum hinzugefügt. Es wird empfohlen, diese Option für die meisten Bücher auszuwählen.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Cover einfügen:</h5>
            <p className="text-sm text-muted-foreground">
              Das Bild, das Sie als Buchcover hochladen, wird in E-Book-Readern angezeigt und automatisch generiert. Wenn Sie möchten, dass das Coverbild als Seite innerhalb des Buches angezeigt wird, wählen Sie diese Option.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Inhaltsverzeichnis einfügen:</h5>
            <p className="text-sm text-muted-foreground">
              Das System generiert ein Inhaltsverzeichnis, das vollständig mit E-Book-Readern kompatibel ist. Alternativ können Sie am Anfang des Buches eine zusätzliche Inhaltsverzeichnisseite hinzufügen. In den meisten Fällen ist das integrierte Inhaltsverzeichnis ausreichend und muss nicht ausgewählt werden.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <h5 className="font-medium">Credits:</h5>
            <p className="text-sm text-muted-foreground">
              Die Veröffentlichung Ihres Buches als EPUB-Datei kostet 200 Credits. Wenn dasselbe Buch mehrmals veröffentlicht wird, werden für jede Transaktion separate Credits abgezogen.
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="es" className="mt-4 space-y-4">
        <h3 className="text-lg font-semibold">Acerca de la generación de ePub:</h3>
        <p>La producción de ePub se lleva a cabo utilizando la biblioteca Pandoc, estándar en el sector.</p>
        
        <h4 className="font-medium mt-4">Acerca de las opciones:</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium">Incluir imprenta:</h5>
            <p className="text-sm text-muted-foreground">
              Esto añade una página de título al principio del libro que contiene información como el título, el autor, el editor y la fecha de publicación. Se recomienda seleccionar esta opción para la mayoría de los libros.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Incluir portada:</h5>
            <p className="text-sm text-muted-foreground">
              La imagen que suba como portada del libro aparecerá en los lectores de libros electrónicos y se generará automáticamente. Si prefiere que la imagen de la portada se muestre como una página dentro del libro, seleccione esta opción.
            </p>
          </div>
          
          <div>
            <h5 className="font-medium">Incluir índice:</h5>
            <p className="text-sm text-muted-foreground">
              El sistema genera una página de índice totalmente compatible con los lectores ePub. También puede añadir una página de índice adicional al principio del libro. En la mayoría de los casos, la página de índice integrada es suficiente y no es necesario seleccionarla.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <h5 className="font-medium">Créditos:</h5>
            <p className="text-sm text-muted-foreground">
              Publicar su libro como archivo EPUB cuesta 200 créditos. Si se publica el mismo libro varias veces, se deducen créditos separados por cada transacción.
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
