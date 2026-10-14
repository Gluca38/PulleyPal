import { getTranslations } from "next-intl/server";
import { logout } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

// Wer ist angemeldet, plus Abmelden. Liest die Anmeldung, steht daher hinter <Suspense>.
export async function AccountBar() {
  const user = await getCurrentUser();
  const t = await getTranslations("Konto");

  return (
    <footer className="account-bar">
      <p>{t("angemeldetAls", { email: user.email })}</p>
      <form action={logout}>
        <button type="submit" className="secondary">
          {t("abmelden")}
        </button>
      </form>
    </footer>
  );
}
