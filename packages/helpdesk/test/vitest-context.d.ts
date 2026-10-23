// Values provided by packages/db/test/global-setup.ts.
declare module "vitest" {
  export interface ProvidedContext {
    db: { ownerUrl: string; appUrl: string; authUrl: string };
  }
}

export {};
