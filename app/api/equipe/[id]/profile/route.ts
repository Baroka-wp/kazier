import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTeamManager } from "@/lib/permissions";

export type TeamMember = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: string; // côté front, tu utilises déjà string
  user_id: number | null;
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
  id: number;
  evaluator_name: string;
  report_date: string;
  comment: string;
};

export type TeamMemberProfileData = {
  member: TeamMember;
  stats: EvaluationStats;
  comments: EvaluationComment[];
};

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user as { role?: string; team_id?: number } | undefined;
    const role = user?.role ?? null;

    // params est une Promise en Next.js récent, il faut l'await
    const { id } = await context.params;
    const memberId = parseInt(id, 10);

    if (isNaN(memberId)) {
      return NextResponse.json({ error: "Identifiant de membre invalide" }, { status: 400 });
    }

    // 1) Récupérer le membre
    const team = await prisma.teams.findUnique({
      where: { id: memberId },
      include: {
        users: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }

    const userEntity = team.users[0] ?? null;

    const member = {
      id: team.id,
      first_name: team.first_name,
      last_name: team.last_name,
      full_name: `${team.first_name || ""} ${team.last_name || ""}`.trim(),
      phone: team.phone,
      age: team.age,
      is_boss: team.is_boss,
      slack_id: team.slack_id,
      created_at: team.created_at.toISOString(),
      user_id: userEntity?.id ?? null,
      email: userEntity?.email ?? null,
      role: userEntity?.role ?? null,
    };

    // 2) Filtres d’accès pour TM
    let allowedTeamIds: number[] | undefined = undefined;

    if (isTeamManager(role) && user?.team_id) {
      const projects = await prisma.project.findMany({
        where: { team_ids: { has: user.team_id } },
        select: { team_ids: true },
      });
      const ids = [...new Set(projects.flatMap((p) => p.team_ids))];
      allowedTeamIds = ids;
    }

    if (allowedTeamIds && !allowedTeamIds.includes(memberId)) {
      return NextResponse.json({ error: "Accès non autorisé à ce membre" }, { status: 403 });
    }

    // 3) Évaluations du membre
    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluated_id: memberId,
      },
      include: {
        evaluator: true,
      },
      orderBy: { report_date: "desc" },
    });

    const total = evaluations.length;

    function avg(getField: (e: (typeof evaluations)[number]) => number) {
      if (!total) return { average: 0, percentage: 0 };
      const sum = evaluations.reduce((acc, e) => acc + getField(e), 0);
      const average = sum / total;
      const percentage = Math.round((average / 5) * 100);
      return { average, percentage };
    }

    const stats = {
      totalEvaluations: total,
      communication: avg((e) => e.communication),
      collaboration: avg((e) => e.collaboration),
      punctuality: avg((e) => e.punctuality),
    };

    const comments = evaluations
      .filter((e) => e.comment)
      .slice(0, 5)
      .map((e) => {
        const evaluatorName =
          `${e.evaluator.first_name ?? ""} ${e.evaluator.last_name ?? ""}`.trim() || "Anonyme";

        return {
          id: e.id,
          evaluator_name: evaluatorName,
          report_date: e.report_date.toISOString(),
          comment: e.comment as string,
        };
      });

    return NextResponse.json({
      member,
      stats,
      comments,
    });
  } catch (error) {
    console.error("[API /equipe/[id]/profile]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}
