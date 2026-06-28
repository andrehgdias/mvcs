import assert from "assert";
import { beforeEach, describe, it, mock, type Mock } from "node:test";
import {
  init,
  MVCS_REPOSITORY_NAME,
  SNAPSHOTS_REPOSITORY_NAME,
  type FsWrapper,
} from "../src/mvcs.js";
import path from "path";

describe("init", function () {
  let mockMkdir: Mock<FsWrapper["mkdir"]>;
  let fs: FsWrapper;

  beforeEach(function () {
    mockMkdir = mock.fn(async (_path: string) => {});
    fs = {
      mkdir: mockMkdir,
    };
  });

  it("creates .mvcs directory", async function () {
    await init(fs);

    assert.strictEqual(mockMkdir.mock.callCount(), 2);

    const mvcsCallArgs = mockMkdir.mock.calls.at(0)!.arguments;
    const pathComponents = path.parse(mvcsCallArgs.at(0)!);
    assert.strictEqual(pathComponents.name, MVCS_REPOSITORY_NAME);
  });

  it("creates .mvcs/snapshots directory", async function () {
    await init(fs);

    assert.strictEqual(mockMkdir.mock.callCount(), 2);

    const snapshotsCallArgs = mockMkdir.mock.calls.at(1)!.arguments;
    const pathComponents = path.parse(snapshotsCallArgs.at(0)!);
    assert.strictEqual(
      pathComponents.dir.split(path.sep).at(-1),
      MVCS_REPOSITORY_NAME,
    );
    assert.strictEqual(pathComponents.name, SNAPSHOTS_REPOSITORY_NAME);
  });

  it("fails when repository is already initialized - .mvcs alreday exists", async function () {
    mockMkdir = mock.fn((_path: string) => {
      throw new Error("");
    });
    fs = {
      mkdir: mockMkdir,
    };

    await assert.rejects(async function () {
      await init(fs);
    }, "/^Error: Repository already initialized$");
  });
});
