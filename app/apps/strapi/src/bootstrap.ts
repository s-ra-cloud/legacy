import fs from 'fs';
import path from 'path';
import type { Core } from '@strapi/strapi';

type FileData = { filepath: string; originalFilename: string; size: number; mimetype: string };
type FileMap = Record<string, FileData>;

let strapi: Core.Strapi;

function resolveSeedUploadPath(fileName: string): string {
  const candidates = [
    path.join(__dirname, '..', 'data', 'uploads', 'hero-philosopher', fileName),
    path.join(process.cwd(), 'data', 'uploads', 'hero-philosopher', fileName),
    path.join(process.cwd(), 'apps', 'strapi', 'data', 'uploads', 'hero-philosopher', fileName),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function fileData(fileName: string): FileData | null {
  const filepath = resolveSeedUploadPath(fileName);
  if (!fs.existsSync(filepath)) return null;
  const size = fs.statSync(filepath).size;
  const ext = fileName.split('.').pop()!;
  return {
    filepath,
    originalFilename: fileName,
    size,
    mimetype: `image/${ext === 'svg' ? 'svg+xml' : ext}`,
  };
}

async function uploadFiles(entry: Record<string, unknown>, files: FileMap) {
  for (const [key, file] of Object.entries(files)) {
    const [name] = file.originalFilename.split('.');
    const [uploaded] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        files: file,
        data: { fileInfo: { alternativeText: name, caption: name, name } },
      });
    entry[key] = uploaded.id;
  }
}

function sanitizeSeedData<T extends Record<string, unknown>>(data: T): T {
  const stripIds = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripIds);
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === 'id' || k === 'localizations') continue;
        out[k] = stripIds(v);
      }
      return out;
    }
    return value;
  };
  return stripIds(data) as T;
}

type HomePhilosopherSeed = {
  name: string;
  slug: string;
  dates: string;
  era: string;
  showInHero: boolean;
  showOnEarth: boolean;
  heroIndex?: number;
  showOnMobile?: boolean;
  heroQuote?: string;
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
  school?: string;
  earthQuote?: string;
  earthOrder?: number;
  imageFile?: string;
};

const HOME_PHILOSOPHERS_SEED: HomePhilosopherSeed[] = [
  {
    name: 'Socrates',
    slug: 'socrates',
    dates: '470 - 399 BC',
    era: 'Classical Antiquity',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 1,
    showOnMobile: true,
    heroQuote: 'The unexamined life is not worth living.',
    city: 'Athens',
    country: 'Greece',
    lat: 37.98,
    lon: 23.73,
    school: 'Classical Greek',
    earthQuote: 'The unexamined life is not worth living.',
    earthOrder: 1,
    imageFile: 'socrates.jpg',
  },
  {
    name: 'Plato',
    slug: 'plato',
    dates: '428 - 348 BC',
    era: 'Classical Antiquity',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 2,
    showOnMobile: true,
    heroQuote: 'Thinking: the talking of the soul with itself.',
    city: 'Athens',
    country: 'Greece',
    lat: 37.98,
    lon: 23.73,
    school: 'Platonism',
    earthQuote: 'Wise men speak because they have something to say.',
    earthOrder: 2,
    imageFile: 'plato.png',
  },
  {
    name: 'Aristotle',
    slug: 'aristotle',
    dates: '384 - 322 BC',
    era: 'Classical Antiquity',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 3,
    showOnMobile: false,
    heroQuote: 'Knowing yourself is the beginning of all wisdom.',
    city: 'Stagira',
    country: 'Macedonia',
    lat: 40.6,
    lon: 23.7,
    school: 'Peripatetic',
    earthQuote: 'We are what we repeatedly do. Excellence is a habit.',
    earthOrder: 3,
    imageFile: 'aristotle.png',
  },
  {
    name: 'Confucius',
    slug: 'confucius',
    dates: '551 - 479 BC',
    era: 'Eastern Antiquity',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 4,
    showOnMobile: true,
    heroQuote: 'Our greatest glory is not in never falling, but in rising every time we fall.',
    city: 'Qufu',
    country: 'China',
    lat: 35.59,
    lon: 116.99,
    school: 'Confucianism',
    earthQuote: 'It does not matter how slowly you go as long as you do not stop.',
    earthOrder: 4,
    imageFile: 'confucius.png',
  },
  {
    name: 'Laozi',
    slug: 'laozi',
    dates: 'c. 6th century BC',
    era: 'Eastern Antiquity',
    showInHero: false,
    showOnEarth: true,
    city: 'Luyi',
    country: 'China',
    lat: 33.86,
    lon: 115.49,
    school: 'Taoism',
    earthQuote: 'A journey of a thousand miles begins with a single step.',
    earthOrder: 5,
  },
  {
    name: 'Gautama Buddha',
    slug: 'gautama-buddha',
    dates: '563 - 483 BC',
    era: 'Eastern Antiquity',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 5,
    showOnMobile: false,
    heroQuote: 'All that we are is the result of what we have thought.',
    city: 'Lumbini',
    country: 'Nepal',
    lat: 27.49,
    lon: 83.28,
    school: 'Buddhism',
    earthQuote: 'The mind is everything. What you think you become.',
    earthOrder: 6,
    imageFile: 'gautama-buddha.png',
  },
  {
    name: 'Avicenna',
    slug: 'avicenna',
    dates: '980 - 1037',
    era: 'Islamic Golden Age',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 6,
    showOnMobile: false,
    heroQuote: 'Knowledge is the conformity of the object and the intellect.',
    city: 'Bukhara',
    country: 'Persia',
    lat: 39.77,
    lon: 64.42,
    school: 'Peripatetic',
    earthQuote: 'The world is divided into men of wit without religion and of religion without wit.',
    earthOrder: 7,
    imageFile: 'avicenna.png',
  },
  {
    name: 'Averroes',
    slug: 'averroes',
    dates: '1126 - 1198',
    era: 'Islamic Golden Age',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 7,
    showOnMobile: false,
    heroQuote: 'Truth does not contradict truth.',
    city: 'Cordoba',
    country: 'Al-Andalus',
    lat: 37.88,
    lon: -4.78,
    school: 'Averroism',
    earthQuote: 'Ignorance leads to fear, fear leads to hate, hate leads to violence.',
    earthOrder: 8,
  },
  {
    name: 'Al-Ghazali',
    slug: 'al-ghazali',
    dates: '1058 - 1111',
    era: 'Islamic Golden Age',
    showInHero: false,
    showOnEarth: true,
    city: 'Tus',
    country: 'Persia',
    lat: 36.46,
    lon: 59.59,
    school: 'Sufism',
    earthQuote: 'Declare your jihad on thirteen enemies you cannot see.',
    earthOrder: 9,
  },
  {
    name: 'Maimonides',
    slug: 'maimonides',
    dates: '1138 - 1204',
    era: 'Medieval',
    showInHero: false,
    showOnEarth: true,
    city: 'Cordoba',
    country: 'Al-Andalus',
    lat: 37.88,
    lon: -4.78,
    school: 'Jewish Aristotelianism',
    earthQuote: 'Anticipate charity by preventing poverty.',
    earthOrder: 10,
  },
  {
    name: 'Rene Descartes',
    slug: 'descartes',
    dates: '1596 - 1650',
    era: 'Enlightenment',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 8,
    showOnMobile: true,
    heroQuote: 'I think, therefore I am.',
    city: 'La Haye',
    country: 'France',
    lat: 47.0,
    lon: 0.7,
    school: 'Rationalism',
    earthQuote: 'I think, therefore I am.',
    earthOrder: 11,
  },
  {
    name: 'Baruch Spinoza',
    slug: 'spinoza',
    dates: '1632 - 1677',
    era: 'Enlightenment',
    showInHero: false,
    showOnEarth: true,
    city: 'Amsterdam',
    country: 'Netherlands',
    lat: 52.37,
    lon: 4.89,
    school: 'Rationalism',
    earthQuote: 'Peace is not an absence of war; it is a virtue, a state of mind.',
    earthOrder: 12,
  },
  {
    name: 'Immanuel Kant',
    slug: 'kant',
    dates: '1724 - 1804',
    era: 'Enlightenment',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 9,
    showOnMobile: false,
    heroQuote: 'Act so that the maxim of your will could be a universal law.',
    city: 'Konigsberg',
    country: 'Prussia',
    lat: 54.71,
    lon: 20.51,
    school: 'Critical Idealism',
    earthQuote: 'Act only according to that maxim by which you can will it to become a universal law.',
    earthOrder: 13,
  },
  {
    name: 'Friedrich Nietzsche',
    slug: 'nietzsche',
    dates: '1844 - 1900',
    era: 'Modern',
    showInHero: true,
    showOnEarth: true,
    heroIndex: 10,
    showOnMobile: false,
    heroQuote: 'He who has a why to live can bear almost any how.',
    city: 'Rocken',
    country: 'Prussia',
    lat: 51.27,
    lon: 12.18,
    school: 'Existentialism',
    earthQuote: 'He who has a why to live can bear almost any how.',
    earthOrder: 14,
  },
  {
    name: 'Ludwig Wittgenstein',
    slug: 'wittgenstein',
    dates: '1889 - 1951',
    era: 'Modern',
    showInHero: false,
    showOnEarth: true,
    city: 'Vienna',
    country: 'Austria',
    lat: 48.21,
    lon: 16.37,
    school: 'Analytic',
    earthQuote: 'Whereof one cannot speak, thereof one must be silent.',
    earthOrder: 15,
  },
];

async function ensurePublicPermissions() {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });
  if (!publicRole) return;

  const permissions: Record<string, string[]> = {
    'home-philosopher': ['find', 'findOne'],
  };

  for (const [controller, actions] of Object.entries(permissions)) {
    for (const action of actions) {
      const actionKey = `api::${controller}.${controller}.${action}`;
      const exists = await strapi.query('plugin::users-permissions.permission').findOne({
        where: { action: actionKey, role: publicRole.id },
      });
      if (!exists) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action: actionKey, role: publicRole.id },
        });
      }
    }
  }
}

async function seedHomePhilosophers() {
  const existing = await strapi.documents('api::home-philosopher.home-philosopher').findMany({
    limit: 1,
  });
  if (existing.length > 0) {
    console.log('[seed] home-philosophers: table not empty, skipping');
    return;
  }

  let created = 0;
  for (const seed of HOME_PHILOSOPHERS_SEED) {
    const { imageFile, ...data } = seed;
    const entry = sanitizeSeedData({ ...data, publishedAt: new Date() });

    if (imageFile) {
      const file = fileData(imageFile);
      if (file) {
        await uploadFiles(entry, { image: file });
      } else {
        console.warn(`[seed] home-philosophers: image not found for ${seed.name} (${imageFile})`);
      }
    }

    await strapi.documents('api::home-philosopher.home-philosopher').create({
      data: entry as any,
      status: 'published',
    });
    created++;
  }

  console.log(`[seed] home-philosophers: created ${created} entries`);
}

async function seed() {
  await ensurePublicPermissions();
  await seedHomePhilosophers();
}

export async function bootstrap(instance: Core.Strapi) {
  strapi = instance;
  try {
    console.log('[seed] Running seed...');
    await seed();
    console.log('[seed] Done.');
  } catch (error) {
    console.error('[seed] Failed:', error);
  }
}
