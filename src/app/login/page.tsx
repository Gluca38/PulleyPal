import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { INVALID_LINK_ERROR } from "./invalid-link";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = useTranslations("Login");

  return (
    <main>
      <h1>{t("titel")}</h1>
      <Suspense fallback={null}>
        <InvalidLinkHint searchParams={searchParams} />
      </Suspense>
      <p>{t("anleitung")}</p>
      <LoginForm />
    </main>
  );
}

async function InvalidLinkHint({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { fehler } = await searchParams;
  if (fehler !== INVALID_LINK_ERROR) {
    return null;
  }

  const t = await getTranslations("Login");
  return <p role="alert">{t("linkUngueltig")}</p>;
}
