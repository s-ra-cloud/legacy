/**
 * Vite injects `import.meta.env` in client bundles. This package is built with plain `tsc`,
 * so we declare the fields we read here (see env-client.ts).
 */
interface ImportMetaEnv {
	readonly DEV: boolean;
	readonly PROD: boolean;
	readonly MODE: string;
	readonly SSR: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
