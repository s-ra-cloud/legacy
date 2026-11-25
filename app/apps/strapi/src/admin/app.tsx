import type { StrapiApp } from '@strapi/strapi/admin';

import LegacyLogo from './extensions/legacy-logo.svg';
import { legacyDarkTheme, legacyLightTheme } from './theme';

export default {
  config: {
    auth: {
      logo: LegacyLogo,
    },
    menu: {
      logo: LegacyLogo,
    },
    theme: {
      light: legacyLightTheme,
      dark: legacyDarkTheme,
    },
    locales: ['en'],
    translations: {
      en: {
        'Auth.form.welcome.title': 'Welcome to Legacy',
        'Auth.form.welcome.subtitle':
          'Sign in with your administrator account to manage content.',
      },
    },
  },
  bootstrap(_app: StrapiApp) {},
};
