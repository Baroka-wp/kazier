import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string | null;
    team_id?: number | null;
    first_name?: string | null;
    last_name?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role?: string | null;
      team_id?: number | null;
      first_name?: string | null;
      last_name?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string | null;
    team_id?: number | null;
    first_name?: string | null;
    last_name?: string | null;
  }
}
