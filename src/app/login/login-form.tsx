"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { requestLoginLink, type LoginLinkState } from "./actions";

const initialState: LoginLinkState = { status: "idle" };

export function LoginForm() {
  const t = useTranslations("Login");
  const [state, formAction, pending] = useActionState(requestLoginLink, initialState);

  return (
    <form action={formAction}>
      <label htmlFor="email">{t("emailLabel")}</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <button type="submit" disabled={pending}>
        {pending ? t("sendet") : t("linkAnfordern")}
      </button>

      {state.status === "sent" && <p role="status">{t("linkGesendet", { email: state.email })}</p>}
      {state.status === "invalid" && <p role="alert">{t("emailUngueltig")}</p>}
      {state.status === "error" && <p role="alert">{t("fehlerBeimSenden")}</p>}
    </form>
  );
}
