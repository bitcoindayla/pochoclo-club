import { signOutMember } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutMember}>
      <button className="textButton" type="submit">
        Cerrar sesión
      </button>
    </form>
  );
}
