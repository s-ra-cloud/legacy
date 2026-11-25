import type { Team } from "@repo/server";

export type TeamPageCategory =
  | Team["category"]
  | "Community Management";

export type TeamPageMember = {
  id: string | number;
  name: string;
  role: string;
  affiliation: string | null;
  category: TeamPageCategory;
  description: string;
  picture?: { url: string } | null;
};

export const RND_COORDINATION: TeamPageMember = {
  id: "chaire-des-transitions-um6p",
  name: "Chaire des Transitions (UM6P)",
  role: "Project Management & Coordination",
  affiliation: "University Mohammed VI Polytechnic",
  category: "Research & development team",
  description:
    "A team of project managers, project coordinators, and other professionals oversees and coordinates all research and development activities related to the LEGACY platform.",
};

export const NEW_TEAM_MEMBERS: readonly TeamPageMember[] = [
  {
    id: "pieter-francois",
    name: "Pieter François",
    role: "Concept & Design",
    affiliation:
      "Computational Humanities Lab, Regent’s Park College, University of Oxford",
    category: "Direction & Design",
    description:
      "Contributes to the overall conceptual design and strategic development of the platform, with a particular focus on institutional partnerships, computational methodologies, artificial intelligence, and the integration of advanced digital humanities approaches.",
  },
  {
    id: "giovana-di-martino",
    name: "Giovana Di Martino",
    role: "Community Manager",
    affiliation:
      "Postdoctoral Researcher, Computational Humanities Lab, Regent’s Park College, University of Oxford",
    category: "Community Management",
    description:
      "Supports the development and coordination of the platform's international academic community, facilitating collaboration between researchers, partner institutions, and contributors. Helps strengthen community engagement, communication, and participation across the project's research network.",
  },
  {
    id: "austin-kozlowski",
    name: "Austin Kozlowski",
    role: "Research & Development",
    affiliation: "Knowledge Lab, University of Chicago",
    category: "Research & development team",
    description:
      "Contributes to the computational and technical dimensions of the project, particularly computational research methodologies, artificial intelligence, knowledge networks, and the development of innovative tools for analyzing scholarly and intellectual relationships.",
  },
];

function normalizeName(name: string) {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

function fromCms(member: Team): TeamPageMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    affiliation: member.affiliation ?? null,
    category: member.category,
    description: member.description,
    picture: member.picture ? { url: member.picture.url } : null,
  };
}

export function getTeamPageMembers(members: readonly Team[]): TeamPageMember[] {
  const existingMembers = members
    .filter((member) => normalizeName(member.name) !== "aspiration collective")
    .map(fromCms);

  for (const member of NEW_TEAM_MEMBERS) {
    const nameKey = normalizeName(member.name);
    const currentIndex = existingMembers.findIndex(
      (current) => normalizeName(current.name) === nameKey,
    );
    if (currentIndex === -1) {
      existingMembers.push(member);
      continue;
    }
    const current = existingMembers[currentIndex];
    if (!current) {
      existingMembers.push(member);
      continue;
    }
    existingMembers[currentIndex] = {
      ...current,
      ...member,
      id: current.id,
      picture: current.picture ?? member.picture,
    };
  }

  return existingMembers;
}
