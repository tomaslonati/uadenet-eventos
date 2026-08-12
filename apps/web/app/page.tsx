const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function getHealth(): Promise<{ status: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { status: string };
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getHealth();

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>uadenet-eventos</h1>
      <p>
        Estado de <code>apps/api</code> ({API_BASE_URL}/health):{" "}
        {health ? health.status : "sin respuesta"}
      </p>
    </main>
  );
}
