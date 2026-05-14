import type { Schema, Struct } from '@strapi/strapi';

export interface SharedFileWithCover extends Struct.ComponentSchema {
  collectionName: 'components_shared_file_with_covers';
  info: {
    displayName: 'FileWithCover';
  };
  attributes: {
    cover: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    file: Schema.Attribute.Media<'files'> & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.file-with-cover': SharedFileWithCover;
    }
  }
}
