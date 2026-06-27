import assert from "assert";
import { describe, it, mock } from "node:test";
import { init, MVCS_REPOSITORY_NAME, type FsWrapper } from "../src/mvcs.js";
import path from "path";

describe("init", function () {
  it("creates .mvcs directory", async function () {
    const calls: (string | URL)[] = [];

    const fs: FsWrapper = {
      mkdir: mock.fn((path) => calls.push(path)),
    };

    await init(fs);

    assert.strictEqual(calls.length, 1);

    const pathComponents = path.parse(calls[0]!.toString());
    assert.strictEqual(pathComponents.name, MVCS_REPOSITORY_NAME);
  });

  it.todo("creates .mvcs/snapshots directory", function () {});

  it.todo("fails when .mvcs alreday exists", function () {});
});
