export {};

declare global {
  interface Window {
    __ENV__: {
      APP_ENV: string;
      PUBLIC_BASE: string;
      API_BASE_URL: string;
      KEYCLOAK_URL: string;
      KEYCLOAK_REALM: string;
      KEYCLOAK_CLIENT_ID: string;
      MEDIA_BASE_URL: string;
    };
  }
}
