import {
  personaLibrary,
  personasByCategory,
} from "@engine/personas/library";

export async function GET(): Promise<Response> {
  const personas = Object.values(personaLibrary).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    techProficiency: p.techProficiency,
    isMobile: p.isMobile,
    connectionSpeed: p.connectionSpeed,
    accessibilityNeeds: p.accessibilityNeeds,
    maxSteps: p.maxSteps,
    patienceLevel: p.patienceLevel,
    goals: p.goals,
    frustrations: p.frustrations,
  }));

  return Response.json({ personas, categories: personasByCategory });
}
