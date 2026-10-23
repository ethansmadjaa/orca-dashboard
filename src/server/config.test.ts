import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("uses safe defaults", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 4317,
      orcaCommand: "orca",
      demo: false,
      production: false,
    });
  });

  it("reads overrides from the environment", () => {
    const config = loadConfig({
      PORT: "8080",
      ORCA_CLI_COMMAND: "/opt/orca",
      ORCA_DASHBOARD_DEMO: "1",
      NODE_ENV: "production",
    });
    expect(config).toMatchObject({ port: 8080, orcaCommand: "/opt/orca", demo: true, production: true });
  });

  it("treats an empty ORCA_CLI_COMMAND as unset", () => {
    expect(loadConfig({ ORCA_CLI_COMMAND: "" }).orcaCommand).toBe("orca");
  });

  it.each(["0", "65536", "abc", "12.5"])("rejects PORT=%s", (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(/Invalid PORT/);
  });

  it("never binds outside loopback, whatever the environment says", () => {
    expect(loadConfig({ HOST: "0.0.0.0" }).host).toBe("127.0.0.1");
  });
});
