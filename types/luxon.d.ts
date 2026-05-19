declare module "luxon" {
  export const DateTime: {
    fromISO(value: string): {
      toRelative(): null | string;
    };
  };
}
