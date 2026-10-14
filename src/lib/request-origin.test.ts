import { describe, expect, it } from "vitest";
import { getRequestOrigin } from "./request-origin";

describe("getRequestOrigin", () => {
  it("nimmt die Origin des Browsers", () => {
    const headers = new Headers({ origin: "https://pulleypal-git-abc.vercel.app", host: "intern" });

    expect(getRequestOrigin(headers)).toBe("https://pulleypal-git-abc.vercel.app");
  });

  it("nutzt sonst die weitergeleitete Domain", () => {
    const headers = new Headers({
      "x-forwarded-host": "www.pulleypal.app",
      "x-forwarded-proto": "https",
      host: "intern",
    });

    expect(getRequestOrigin(headers)).toBe("https://www.pulleypal.app");
  });

  it("ignoriert eine leere Origin", () => {
    const headers = new Headers({ origin: "null", host: "localhost:3000", "x-forwarded-proto": "http" });

    expect(getRequestOrigin(headers)).toBe("http://localhost:3000");
  });

  it("liefert null ohne Domain-Angabe", () => {
    expect(getRequestOrigin(new Headers())).toBeNull();
  });
});
