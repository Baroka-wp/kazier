import { NextResponse } from "next/server";
import { getTeamsData } from "@/lib/equipe-actions";
import { auth } from "@/auth";
import { isTeamManager, isSuperAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const session = await auth();

    //Vérification de l'authentification
    if (!session) {
      return new NextResponse("Non authentifié : Session manquante", { status: 401 });
    }

    const user = session?.user as { role?: string; team_id?: number };
    const role = user?.role ?? null;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || undefined;
    const roleFilter = searchParams.get("role") || undefined;

    // 👇 Si TM, récupérer les team_ids de ses projets
    let allowedTeamIds: number[] | undefined = undefined;
    if (isTeamManager(role) && user?.team_id) {
      const projects = await prisma.project.findMany({
        where: { team_ids: { has: user.team_id } },
        select: { team_ids: true },
      });
      const ids = [...new Set(projects.flatMap((p) => p.team_ids))];
      allowedTeamIds = ids;
    }

    const result = await getTeamsData({
      page,
      limit,
      search,
      role: roleFilter,
      allowedTeamIds, // 👈 passer au filtre
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
    const session = await auth();

    // Vérification de l'authentification
    if (!session) {
      return new NextResponse("Non authentifié : Session manquante", { status: 401 });
    }

    const user = session?.user as { role?: string; team_id?: number };
    const role = user?.role ?? null;

    // Seul un Super Admin peut créer un nouveau membre
    if (!isSuperAdmin(role)) {
      return NextResponse.json(
        { error: "Accès refusé : seul un Super Admin peut créer un membre" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      age,
      slack_id,
      role: memberRole,
      is_boss,
    } = body;

    // Validation des champs requis
    if (!first_name || !last_name || !email || !password || !memberRole) {
      return NextResponse.json(
        { error: "Les champs prénom, nom, email, mot de passe et rôle sont requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer le membre dans la table teams
    const newTeamMember = await prisma.teams.create({
      data: {
        first_name,
        last_name,
        phone: phone || null,
        age: age ? parseInt(age) : null,
        slack_id: slack_id || null,
        is_boss: is_boss || false,
      },
    });

    // Créer l'utilisateur associé
    await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        role: memberRole,
        team_id: newTeamMember.id,
      },
    });

    return NextResponse.json(
      {
        message: "Membre créé avec succès",
        member: {
          id: newTeamMember.id,
          first_name: newTeamMember.first_name,
          last_name: newTeamMember.last_name,
          email,
          role: memberRole,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /equipe POST]", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du membre" },
      { status: 500 }
    );
  }
}
