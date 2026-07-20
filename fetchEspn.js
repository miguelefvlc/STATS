const fs = require('fs');

async function check() {
  try {
    const res = await fetch('https://espndeportes.espn.com/basquetbol/nba/jugador/juego-a-juego/_/id/3155526/dillon-brooks');
    const html = await res.text();
    fs.writeFileSync('espn.html', html);
    console.log("HTML length:", html.length);
    // Find the latest game row.
    // It's usually in a table with class "Table" or similar.
    // Look for recent dates or "Temporada Regular".
    const lines = html.split('\n');
    console.log("Written to espn.html");
  } catch(e) {
    console.error(e);
  }
}

check();
