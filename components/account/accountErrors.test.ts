import { describe, expect, it } from "vitest";
import { describeAccountError } from "./accountErrors";

const t = (key: string) => `translated:${key}`;

describe("describeAccountError", () => {
  it.each([
    "email_exists",
    "user_already_exists",
    "invalid_credentials",
    "otp_expired",
    "over_email_send_rate_limit",
    "over_request_rate_limit",
    "weak_password",
    "email_address_invalid",
    "same_password",
  ])("translates known code %s via the AccountErrors namespace", (code) => {
    expect(describeAccountError({ code, message: "raw supabase message" }, t)).toBe(
      `translated:${code}`
    );
  });

  it("falls back to the raw message for an unrecognized code", () => {
    expect(describeAccountError({ code: "some_unmapped_code", message: "raw message" }, t)).toBe(
      "raw message"
    );
  });

  it("falls back to the generic translation for a plain network error with no message", () => {
    expect(describeAccountError(new Error(""), t)).toBe("translated:generic");
  });

  it("uses a real Error's message when there's no code", () => {
    expect(describeAccountError(new Error("network down"), t)).toBe("network down");
  });
});
