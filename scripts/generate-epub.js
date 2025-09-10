#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { v4: uuidv4 } = require('uuid');
const Epub = require('epub-gen');

// Parse command line arguments
program
  .requiredOption('-i, --input <path>', 'Path to the input JSON file')
  .requiredOption('-o, --output <path>', 'Path to the output EPUB file')
  .option('-m, --metadata <json>', 'Additional metadata as JSON string')
  .parse(process.argv);

const options = program.opts();

// Read and parse the input file
const bookData = JSON.parse(fs.readFileSync(options.input, 'utf8'));
const metadata = options.metadata ? JSON.parse(options.metadata) : {};

// Prepare EPUB options
const epubOptions = {
  title: bookData.title || 'Untitled Book',
  author: bookData.author || 'Unknown Author',
  publisher: 'Bookshall',
  cover: bookData.cover_url || undefined,
  content: [],
  ...metadata
};

// Add chapters to content
if (bookData.chapters && Array.isArray(bookData.chapters)) {
  epubOptions.content = bookData.chapters.map(chapter => ({
    title: chapter.title,
    data: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${chapter.title}</title>
          <link rel="stylesheet" href="styles.css" type="text/css" />
        </head>
        <body>
          <h1>${chapter.title}</h1>
          <div>${chapter.content || ''}</div>
        </body>
      </html>
    `
  }));
}

// Generate the EPUB
async function generateEpub() {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate the EPUB
    await new Epub(epubOptions).promise.then(
      () => {
        console.log(`EPUB generated successfully at ${options.output}`);
        process.exit(0);
      },
      error => {
        console.error('Failed to generate EPUB:', error);
        process.exit(1);
      }
    );
  } catch (error) {
    console.error('Error generating EPUB:', error);
    process.exit(1);
  }
}

generateEpub();
