export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const problems: string[] = [];

  const isPlaceholder = (value: string | undefined) =>
    !value || value.includes("REPLACE_WITH");

  if (isPlaceholder(process.env.DATABASE_URL)) {
    problems.push("DATABASE_URL");
  }
  if (process.env.VERCEL === "1" && isPlaceholder(process.env.BLOB_READ_WRITE_TOKEN)) {
    problems.push("BLOB_READ_WRITE_TOKEN");
  }
  if (
    isPlaceholder(process.env.ADMIN_PASSWORD) ||
    (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12)
  ) {
    problems.push("ADMIN_PASSWORD");
  }
  if (process.env.POSTGRES_PASSWORD && isPlaceholder(process.env.POSTGRES_PASSWORD)) {
    problems.push("POSTGRES_PASSWORD");
  }
  if (problems.length > 0) {
    const message =
      `Configuração de produção inválida: ${problems.join(", ")}. ` +
      "Use valores reais e exclusivos (não placeholders REPLACE_WITH_*). " +
      "ADMIN_PASSWORD precisa de ao menos 12 caracteres. " +
      "Os valores não são registrados em logs.";
    console.error(message);
    throw new Error(message);
  }
}
