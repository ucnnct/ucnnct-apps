export {};

declare global {
  interface Window {
    __ENV__: {
      APP_ENV: string;
      PUBLIC_BASE: string;
      API_BASE_URL: string;
      MEDIA_BASE_URL: string;
    };
  }
}
