// The layer schema, compiled to a standalone validator at build time (../vite-plugin.js): Ajv's shape.
declare module 'virtual:tanrei-studio/validate-layer' {
  const validate: ((data: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
  export default validate;
}
