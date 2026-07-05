import assert from "assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  init,
  MVCS_REPOSITORY_NAME,
  snap,
  SNAPSHOTS_REPOSITORY_NAME,
} from "../src/mvcs.js";
import path from "path";

import fsPromises from "node:fs/promises";

describe("mvcs core functions", function () {
  const workingDirectory = path.join("user", "projects", "personal-project");

  beforeEach(function () {
    mock.method(process, "cwd", () => workingDirectory); // Monkey patching cwd
  });

  afterEach(function () {
    mock.reset();
  });

  describe("init", function () {
    it("creates the .mvcs and snapshots directory structure when run in an uninitialized repository ", async function () {
      const mockMkdir = mock.method(fsPromises, "mkdir", async () => {});

      await init();

      assert.strictEqual(mockMkdir.mock.callCount(), 2);

      const [mvcsDirCall, snapshotDirCall] = mockMkdir.mock.calls;

      const mvcsDirPath = mvcsDirCall?.arguments.at(0)! as string;
      const mvcsDirPathComponents = path.parse(mvcsDirPath);
      assert.strictEqual(mvcsDirPathComponents.dir, workingDirectory);
      assert.strictEqual(mvcsDirPathComponents.base, MVCS_REPOSITORY_NAME);

      const snapshotDirPath = snapshotDirCall?.arguments.at(0)! as string;
      const snapshotDirPathComponents = path.parse(snapshotDirPath);
      assert.strictEqual(
        snapshotDirPathComponents.dir,
        path.join(workingDirectory, MVCS_REPOSITORY_NAME),
      );
      assert.strictEqual(
        snapshotDirPathComponents.base,
        SNAPSHOTS_REPOSITORY_NAME,
      );
    });

    it("throws a 'Repository already initialized' error when a .mvcs folder already exists", async function () {
      const mockMkdir = mock.method(fsPromises, "mkdir", async () => {
        const err = new Error("File already exists");
        (err as any).code = "EEXIST";
        throw err;
      });

      await assert.rejects(init, /^Error: Repository already initialized$/);
    });
  });

  describe("snap", function () {
    const now = new Date("2026-06-01");
    const snapshotDirPath = path.join(
      workingDirectory,
      MVCS_REPOSITORY_NAME,
      SNAPSHOTS_REPOSITORY_NAME,
    );

    beforeEach(function () {
      mock.timers.enable({ apis: ["Date"], now });
    });

    it.todo(
      "saves a complete timestamped backup of the root files when executed from the project root",
      async function () {
        // ...
      },
    );

    it.todo(
      "correctly resolves and copies from the repository root when executed inside a nested subdirectory",
      async function () {
        // ...
      },
    );

    it.todo(
      "rejects with a 'No repository found' error when executed outside of an initialized .mvcs project",
      async function () {
        // ...
      },
    );
  });
});
