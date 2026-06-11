import { NextResponse } from "next/server";
import { getTeamsData } from "@/lib/equipe-actions";
import { auth } from "@/auth";
import { prisma, members as membersCore, projects as projectsCore } from "@/lib/core";
import { currentActor } from "@/lib/server/with-auth";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new NextResponse("Non authentifié : Session manquante", { status: 401 });
    }

    const user = session.user as { id?: string; role?: string };
    const role = user?.role ?? null;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const roleFilter = searchParams.get("role") || undefined;

    // Si PM, on restreint aux membres des projets dont il fait partie
    let allowedTeamIds: string[] | undefined;
    if ((role === "PROJECT_MANAGER" || role === "TM") && user?.id) {
      const projList = await projectsCore.list(
        { type: "HUMAN", memberId: user.id, role: "PROJECT_MANAGER" },
        { memberId: user.id, limit: 100 }
      );
      if (projList.ok) {
        // Tous les membres des projets dont il fait partie
        const memberIdsByProject = await Promise.all(
          projList.data.data.map(async (p) => {
            const detail = await projectsCore.get(
              { type: "HUMAN", memberId: user.id!, role: "PROJECT_MANAGER" },
              p.id
            );
            return detail.ok ? detail.data.members.map((m) => m.memberId) : [];
          })
        );
        allowedTeamIds = [...new Set(memberIdsByProject.flat())];
      }
    }

    const result = await getTeamsData({
      page,
      limit,
      search,
      role: roleFilter,
      allowedTeamIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /equipe]", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'équipe" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await currentActor();
    if (actor.type !== "HUMAN" || actor.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé : seul un Super Admin peut créer un membre" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { first_name, last_name, email, password, phone, age, slack_id, role, is_boss } = body;

    if (!first_name || !last_name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Les champs prénom, nom, email, mot de passe et rôle sont requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.member.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // 1. Créer le Member via le core (audit, validation)
    const created = await membersCore.create(actor, {
      firstName: first_name,
      lastName: last_name,
      email,
      phone: phone || undefined,
      age: age ? parseInt(age) : undefined,
      slackId: slack_id || undefined,
      role,
      isBoss: is_boss || false,
    });
    if (!created.ok) {
      return NextResponse.json({ error: created.message }, { status: 400 });
    }

    // 2. Créer l'Auth associé (hors core — il n'a pas de fonction dédiée)
    const hashed = await bcrypt.hash(password, 10);
    await prisma.auth.create({
      data: {
        memberId: created.data.id,
        email,
        passwordHash: hashed,
      },
    });

    return NextResponse.json(
      {
        message: "Membre créé avec succès",
        member: {
          id: created.data.id,
          first_name: created.data.firstName,
          last_name: created.data.lastName,
          email,
          role: created.data.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /equipe POST]", error);
    return NextResponse.json({ error: "Erreur lors de la création du membre" }, { status: 500 });
  }
}
