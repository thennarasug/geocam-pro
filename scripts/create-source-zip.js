import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function zipDirectory() {
  const zip = new JSZip();
  const rootDir = process.cwd();

  const ignoreList = new Set([
    'node_modules',
    '.git',
    'dist',
    'dev-dist',
    '.DS_Store',
    'bun.lock',
  ]);

  function addFolderToZip(dirPath, zipFolder) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (ignoreList.has(item)) continue;
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const subFolder = zipFolder.folder(item);
        if (subFolder) addFolderToZip(fullPath, subFolder);
      } else {
        // Skip large zip inside public
        if (item.endsWith('.zip')) continue;
        const fileData = fs.readFileSync(fullPath);
        zipFolder.file(item, fileData);
      }
    }
  }

  addFolderToZip(rootDir, zip);

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const outPath = path.join(rootDir, 'public', 'geocam-pro-source.zip');
  fs.writeFileSync(outPath, content);
  console.log(`Source code zip written to: ${outPath} (${(content.length / 1024).toFixed(1)} KB)`);
}

zipDirectory().catch(console.error);
