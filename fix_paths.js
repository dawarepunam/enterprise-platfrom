const fs = require('fs');
const path = require('path');

function fixLinksInHtml(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixLinksInHtml(fullPath);
    } else if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // replace ../_shared/ with /modules/admin/_shared/
      content = content.replace(/\.\.\/_shared\//g, '/modules/admin/_shared/');
      // replace other typical relative assets if necessary, e.g., href="module.css" to href="/modules/admin/module/module.css"
      // actually, if the browser is at /admin/projects, href="projects.css" will resolve to /admin/projects.css
      // we need them to resolve to /modules/admin/projects/projects.css
      // Let's replace href="something.css" with href="/modules/admin/folder/something.css"
      
      const folderName = path.basename(dir);
      
      content = content.replace(/href="([^"]+\.css)"/g, (match, p1) => {
        if (p1.startsWith('/modules')) return match;
        if (p1.startsWith('http')) return match;
        return `href="/modules/admin/${folderName}/${p1}"`;
      });

      content = content.replace(/src="([^"]+\.js)"/g, (match, p1) => {
        if (p1.startsWith('/modules')) return match;
        if (p1.startsWith('http')) return match;
        return `src="/modules/admin/${folderName}/${p1}"`;
      });
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

fixLinksInHtml(path.join(__dirname, 'client/modules/admin'));
console.log('Fixed relative links to absolute paths in HTML files.');
