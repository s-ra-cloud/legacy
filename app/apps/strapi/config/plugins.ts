import path from 'path';

export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  upload: {
    config: {
      provider: path.join(process.cwd(), 'providers', 'object-storage-provider.js'),
      providerOptions: {
        bucket: env('DEFAULT_OBJECT_STORAGE_BUCKET_ID', ''),
        prefix: 'strapi-uploads',
      },
    },
  },
});
