// Keeps this zone's copy of shared/ (src/shared and public/brand) current.
// In the project folder it copies ../shared before dev and build: edit shared files only there.
// In this zone's own repository (GitHub, Vercel) there is no ../shared, and the copy committed
// with the zone is used as it is. So after changing shared/, run dev or build here and commit.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const zone = dirname(fileURLToPath(import.meta.url));
const shared = join(zone, '..', 'shared');

if (!existsSync(join(shared, 'src')) || !existsSync(join(shared, 'public'))) {
  if (!existsSync(join(zone, 'src', 'shared')) || !existsSync(join(zone, 'public', 'brand'))) {
    console.error('src/shared and public/brand are missing: commit them with the zone, or build next to shared/');
    process.exit(1);
  }
  console.log('shared: the committed copy');
  process.exit(0);
}

rmSync(join(zone, 'src', 'shared'), { recursive: true, force: true });
cpSync(join(shared, 'src'), join(zone, 'src', 'shared'), { recursive: true });
cpSync(join(shared, 'public'), join(zone, 'public'), { recursive: true });
console.log('shared: copied from ../shared');