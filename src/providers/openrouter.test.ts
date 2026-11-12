import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DEFAULT_OPTIONS, type Options } from "../core"
import { resolveKey } from "./openrouter"

const ENV_VAR = "OPENROUTER_API_KEY"

function opts(overrides: Partial<Options> = {}): Options {
  return { ...DEFAULT_OPTIONS, ...overrides }
}

function tmpAuthFile(key: string): string {
  const dir = mkdtempSync(join(tmpdir(), "usage-tui-openrouter-"))
  writeFileSync(join(dir, "auth.json"), JSON.stringify({ openrouter: { type: "api", key } }))
  return join(dir, "auth.json")
}

function withEnv(name: string, value: string | undefined, fn: () => void) {
  const previous = process.env[name]
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
  try {
    fn()
  } finally {
    if (previous === undefined) delete process.env[name]
    else process.env[name] = previous
  }
}

describe("resolveKey", () => {
  it("returns the OPENROUTER_API_KEY env var when set", () => {
    withEnv(ENV_VAR, "sk-or-env", () => {
      expect(resolveKey(opts())).toBe("sk-or-env")
    })
  })

  it("prefers the env var over auth.json", () => {
    const authPath = tmpAuthFile("sk-or-file")
    try {
      withEnv(ENV_VAR, "sk-or-env", () => {
        expect(resolveKey(opts({ authPath }))).toBe("sk-or-env")
      })
    } finally {
      rmSync(authPath, { recursive: true, force: true })
    }
  })

  it("falls back to auth.json when the env var is unset", () => {
    const authPath = tmpAuthFile("sk-or-file")
    try {
      withEnv(ENV_VAR, undefined, () => {
        expect(resolveKey(opts({ authPath }))).toBe("sk-or-file")
      })
    } finally {
      rmSync(authPath, { recursive: true, force: true })
    }
  })

  it("treats an empty env var as unset and falls back", () => {
    const authPath = tmpAuthFile("sk-or-file")
    try {
      withEnv(ENV_VAR, "", () => {
        expect(resolveKey(opts({ authPath }))).toBe("sk-or-file")
      })
    } finally {
      rmSync(authPath, { recursive: true, force: true })
    }
  })

  it("honours a custom env var name via options", () => {
    withEnv("MY_ROUTER_KEY", "sk-or-custom", () => {
      expect(resolveKey(opts({ envVar: "MY_ROUTER_KEY" }))).toBe("sk-or-custom")
    })
  })
})
