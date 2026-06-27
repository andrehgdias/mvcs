import assert from "assert";
import { describe, it, mock } from "node:test";
import { init, MVCS_REPOSITORY_NAME, type FsWrapper } from "../src/mvcs.js";
import path from "path";

describe("init", function () {
  it("creates .mvcs directory", async function () {
    const mockMkdir = mock.fn((_path: string) => {});
    const fs: FsWrapper = {
      mkdir: mockMkdir,
    };

    await init(fs);

    assert.strictEqual(mockMkdir.mock.callCount(), 1);

    const args = mockMkdir.mock.calls.at(0)!.arguments;
    const pathComponents = path.parse(args.at(0)!);
    assert.strictEqual(pathComponents.name, MVCS_REPOSITORY_NAME);
  });

  it.todo("creates .mvcs/snapshots directory", function () {});

  it.todo("fails when .mvcs alreday exists", function () {});
});
