const fs = require('fs');

fs.readdir('./src', (err, entries) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const html = entries
    .filter(entry => entry.endsWith('.html'))
    .map(demo => `<a href="./src/${demo}">${demo}</a><br>`)
    .join('');
  fs.writeFileSync('./index.html', html);
});
