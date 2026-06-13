import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, projects as projectsCore } from "@/lib/core";

export type TeamMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: string;
  user_id: string | null;
  email: string | null;
  role: string | null;
};

export type EvaluationStats = {
  communication: { average: number; percentage: number };
  collaboration: { average: number; percentage: number };
  punctuality: { average: number; percentage: number };
  totalEvaluations: number;
};

export type EvaluationComment = {
  id: string;
  evaluator_name: string;
  report_date: string;
  comment: string;
};

export type ProjectInfo = {
  id: string;
  name: string;
  icon: string | null;
};

export type TeamMemberProfileData = {
  member: TeamMember;
  stats: EvaluationStats;
  comments: EvaluationComment[];
  projects: ProjectInfo[];
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    const role = user?.role ?? null;
    const { id: memberId } = await context.params;

    // 1) Membre cible + auth
    const target = await prisma.member.findUnique({
      where: { id: memberId },
      include: { auth: { select: { id: true, email: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }

    const member: TeamMember = {
      id: target.id,
      first_name: target.firstName,
      last_name: target.lastName,
      full_name: `${target.firstName} ${target.lastName}`.trim(),
      phone: target.phone,
      age: target.age,
      is_boss: target.isBoss,
      slack_id: target.slackId,
      created_at: target.createdAt.toISOString(),
      user_id: target.auth?.id ?? null,
      email: target.auth?.email ?? target.email,
      role: target.role,
    };

    // 2) Filtres d'accès pour PM
    if ((role === "PROJECT_MANAGER" || role === "TM") && user?.id) {
      const projList = await projectsCore.list(
        { type: "HUMAN", memberId: user.id, role: "PROJECT_MANAGER" },
        { memberId: user.id, limit: 100 }
      );
      const allowedMemberIds = new Set<string>();
      if (projList.ok) {
        await Promise.all(
          projList.data.data.map(async (p) => {
            const detail = await projectsCore.get(
              { type: "HUMAN", memberId: user.id!, role: "PROJECT_MANAGER" },
              p.id
            );
            if (detail.ok) detail.data.members.forEach((m) => allowedMemberIds.add(m.memberId));
          })
        );
        if (!allowedMemberIds.has(memberId)) {
          return NextResponse.json({ error: "Accès non autorisé à ce membre" }, { status: 403 });
        }
      }
    }

    // 3) Évaluations reçues
    const evaluations = await prisma.evaluation.findMany({
      where: { evaluatedId: memberId },
      include: { evaluator: { select: { firstName: true, lastName: true } } },
      orderBy: { reportDate: "desc" },
    });

    const total = evaluations.length;
    const avg = (getField: (e: (typeof evaluations)[number]) => number) => {
      if (!total) return { average: 0, percentage: 0 };
      const sum = evaluations.reduce((acc, e) => acc + getField(e), 0);
      const average = sum / total;
      return { average, percentage: Math.round((average / 5) * 100) };
    };

    const stats: EvaluationStats = {
      totalEvaluations: total,
      communication: avg((e) => e.communication),
      collaboration: avg((e) => e.collaboration),
      punctuality: avg((e) => e.punctuality),
    };

    const comments: EvaluationComment[] = evaluations
      .filter((e) => e.comment)
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        evaluator_name: `${e.evaluator.firstName} ${e.evaluator.lastName}`.trim() || "Anonyme",
        report_date: e.reportDate.toISOString(),
        comment: e.comment as string,
      }));

    // 4) Projets du membre
    const memberships = await prisma.projectMember.findMany({
      where: { memberId },
      include: { project: { select: { id: true, name: true, icon: true } } },
      orderBy: { project: { name: "asc" } },
    });
    const projectsInfo: ProjectInfo[] = memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      icon: m.project.icon,
    }));

    return NextResponse.json({
      member,
      stats,
      comments,
      projects: projectsInfo,
    });
  } catch (error) {
    console.error("[API /equipe/[id]/profile]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}
