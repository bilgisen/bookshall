const fs = require('fs');
const path = require('path');

// Define the directory to search for files
const rootDir = path.join(__dirname, '..');

// Patterns to search for and their replacements
const importPatterns = [
  {
    pattern: /from ['"]platejs\/react['"]/g,
    replacement: "from '@platejs/core/react'"
  },
  {
    pattern: /from ['"]platejs['"]/g,
    replacement: "from '@platejs/core'"
  },
  {
    pattern: /from ['"]@?platejs\//g,
    replacement: "from '@platejs/"
  }
];

// File extensions to process
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

// Function to process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Apply all replacement patterns
    for (const { pattern, replacement } of importPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        updated = true;
      }
    }

    // Write the file back if changes were made
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated imports in: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
  return false;
}

// Recursively process all files in a directory
function processDirectory(directory) {
  try {
    const files = fs.readdirSync(directory);
    let updatedCount = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (file === 'node_modules' || file === '.git') {
          continue;
        }
        updatedCount += processDirectory(filePath);
      } else if (fileExtensions.includes(path.extname(file).toLowerCase())) {
        if (processFile(filePath)) {
          updatedCount++;
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
    return 0;
  }
}

// Run the script
console.log('Starting to update Plate.js imports...');
const updatedFiles = processDirectory(rootDir);
console.log(`\nUpdated imports in ${updatedFiles} files.`);
