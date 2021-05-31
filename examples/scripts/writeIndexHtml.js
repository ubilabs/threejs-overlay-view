const fs = require('fs');

fs.readdir('./src', (err, demos) => {
  if (err) console.error(err);

  const html = demos
    .filter(demo => demo.endsWith('.html'))
    .map(demo => `<a href="./src/${demo}">${demo}</a><br>`)
    .join('');
  fs.writeFileSync('./index.html', html);
});
