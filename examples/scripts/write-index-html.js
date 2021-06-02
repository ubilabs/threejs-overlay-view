const fs = require('fs');

fs.readdir('./src', (err, entries) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const html = entries
    .filter(entry => entry.endsWith('.html') && entry !== 'index.html')
    .map(demo => `<a href="./${demo}">${demo}</a><br>`)
    .join('');
  fs.writeFileSync('./src/index.html', html);
});
