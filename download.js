import fs from 'fs';
import path from 'path';

const dir = './public/cards';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const SEASONS = ['S1', 'S2', 'S3'];
const MAX_CARDS_PER_SEASON = 100;

async function downloadAllSeasons() {
  console.log('Starting parallel download for S1, S2, and S3...');

  for (const season of SEASONS) {
    console.log(`\nFetching ${season}...`);
    
    const downloads = Array.from({ length: MAX_CARDS_PER_SEASON }, async (_, i) => {
      const num = (i + 1).toString().padStart(3, '0');
      const cardId = `${season}_${num}`;
      const url = `https://assets.narutoninjacards.com/cards/${cardId}/3/cropped/small.png`;
      const filePath = path.join(dir, `${cardId}.png`);

      try {
        const res = await fetch(url);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          fs.writeFileSync(filePath, Buffer.from(buffer));
          console.log(`Saved ${cardId}.png`);
        }
      } catch (err) {
        // Skip missing cards silently
      }
    });

    await Promise.all(downloads);
  }

  console.log('\nAll season downloads complete!');
}

downloadAllSeasons();