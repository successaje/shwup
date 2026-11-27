import { describe, expect, it } from "vitest";
import { isNeonUrl } from ".";

describe("isNeonUrl", () => {
  it("picks Neon's driver only for Neon hosts", () => {
    expect(isNeonUrl("postgresql://u:p@ep-cool-1234-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require")).toBe(true);
    expect(isNeonUrl("postgres://localhost:5432/shwup_dev")).toBe(false);
    expect(isNeonUrl("postgres://evil.neon.tech.example.com/db")).toBe(false);
    expect(isNeonUrl("not a url")).toBe(false);
  });
});
