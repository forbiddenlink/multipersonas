import {
  personaLibrary,
  personasByCategory,
} from "@engine/personas/library";
import { createClient } from "@/lib/supabase/server";

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const personas = Object.values(personaLibrary).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      techProficiency: p.techProficiency,
      isMobile: p.isMobile,
      connectionSpeed: p.connectionSpeed,
      kind: p.kind,
      inputModality: p.inputModality,
      maxSteps: p.maxSteps,
      patienceLevel: p.patienceLevel,
      goals: p.goals,
      frustrations: p.frustrations,
    }));

    return Response.json({ personas, categories: personasByCategory });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
