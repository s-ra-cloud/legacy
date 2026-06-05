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

type HeroPhilosopherSeed = {
  name: string;
  slug: string;
  dates: string;
  era: string;
  quote: string;
  index: number;
  showOnMobile: boolean;
  imageFile?: string;
};

const HERO_PHILOSOPHERS_SEED: HeroPhilosopherSeed[] = [
  {
    name: 'Socrates',
    slug: 'socrates',
    dates: 'c. 470–399 BC',
    era: 'Classical Greek',
    quote: 'The unexamined life is not worth living.',
    index: 1,
    showOnMobile: true,
    imageFile: 'socrates.png',
  },
  {
    name: 'Plato',
    slug: 'plato',
    dates: 'c. 428–348 BC',
    era: 'Classical Greek',
    quote: 'Thinking: the talking of the soul with itself.',
    index: 2,
    showOnMobile: true,
    imageFile: 'plato.png',
  },
  {
    name: 'Aristotle',
    slug: 'aristotle',
    dates: '384–322 BC',
    era: 'Classical Greek',
    quote: 'Knowing yourself is the beginning of all wisdom.',
    index: 3,
    showOnMobile: false,
    imageFile: 'aristotle.png',
  },
  {
    name: 'Confucius',
    slug: 'confucius',
    dates: '551–479 BC',
    era: 'Chinese Antiquity',
    quote: 'Our greatest glory is not in never falling, but in rising every time we fall.',
    index: 4,
    showOnMobile: true,
  },
  {
    name: 'Buddha',
    slug: 'buddha',
    dates: 'c. 563–483 BC',
    era: 'Indian Antiquity',
    quote: 'All that we are is the result of what we have thought.',
    index: 5,
    showOnMobile: false,
  },
  {
    name: 'Avicenna',
    slug: 'avicenna',
    dates: '980–1037',
    era: 'Islamic Golden Age',
    quote: 'Knowledge is the conformity of the object and the intellect.',
    index: 6,
    showOnMobile: false,
  },
  {
    name: 'Averroes',
    slug: 'averroes',
    dates: '1126–1198',
    era: 'Islamic Golden Age',
    quote: 'Truth does not contradict truth.',
    index: 7,
    showOnMobile: false,
  },
  {
    name: 'Descartes',
    slug: 'descartes',
    dates: '1596–1650',
    era: 'Early Modern Philosophy',
    quote: 'I think, therefore I am.',
    index: 8,
    showOnMobile: true,
  },
  {
    name: 'Kant',
    slug: 'kant',
    dates: '1724–1804',
    era: 'Enlightenment',
    quote: 'Act so that the maxim of your will could be a universal law.',
    index: 9,
    showOnMobile: false,
  },
  {
    name: 'Nietzsche',
    slug: 'nietzsche',
    dates: '1844–1900',
    era: 'Modern Philosophy',
    quote: 'He who has a why to live can bear almost any how.',
    index: 10,
    showOnMobile: false,
  },
];

async function ensurePublicPermissions() {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });
  if (!publicRole) return;

  const permissions: Record<string, string[]> = {
    'hero-philosopher': ['find', 'findOne'],
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

async function seedHeroPhilosophers() {
  const existing = await strapi.documents('api::hero-philosopher.hero-philosopher').findMany({
    limit: 1,
  });
  if (existing.length > 0) {
    console.log('[seed] hero-philosophers: table not empty, skipping');
    return;
  }

  let created = 0;
  for (const seed of HERO_PHILOSOPHERS_SEED) {
    const { imageFile, ...data } = seed;
    const entry = sanitizeSeedData({ ...data, publishedAt: new Date() });

    if (imageFile) {
      const file = fileData(imageFile);
      if (file) {
        await uploadFiles(entry, { image: file });
      } else {
        console.warn(`[seed] hero-philosophers: image not found for ${seed.name} (${imageFile})`);
      }
    }

    await strapi.documents('api::hero-philosopher.hero-philosopher').create({
      data: entry as any,
      status: 'published',
    });
    created++;
  }

  console.log(`[seed] hero-philosophers: created ${created} entries`);
}

async function seed() {
  await ensurePublicPermissions();
  await seedHeroPhilosophers();
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
