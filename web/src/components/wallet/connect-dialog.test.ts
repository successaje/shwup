import { describe, expect, it } from "vitest";
import { metamaskDappLink } from "./connect-dialog";

describe("metamaskDappLink", () => {
  it("opens the same page inside MetaMask's browser", () => {
    expect(metamaskDappLink("https://shwup.vercel.app/e/1?x=1")).toBe("https://metamask.app.link/dapp/shwup.vercel.app/e/1?x=1");
  });
});
