import assert from "assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  isNotMvcsDirectory,
  init,
  MVCS_REPOSITORY_NAME,
  snap,
  SNAPSHOTS_REPOSITORY_NAME,
} from "../src/mvcs.js";
import path from "path";

import fsPromises from "node:fs/promises";
import os from "node:os";

describe("mvcs core functions", function () {
  const workingDirectory = path.join("user", "projects", "personal-project");
  const tempDirectory = path.join("user", "temp");

  beforeEach(function () {
    mock.method(process, "cwd", () => workingDirectory); // Monkey patching cwd
    mock.method(os, "tmpdir", () => tempDirectory); // Monkey patching tmpdir
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
      mock.method(fsPromises, "mkdir", async () => {
        const err = new Error("File already exists");
        (err as any).code = "EEXIST";
        throw err;
      });

      await assert.rejects(init, /^Error: Repository already initialized$/);
    });
  });

  describe("helpers", function () {
    it("isNotMvcsDirectory", function () {
      assert.strictEqual(isNotMvcsDirectory("/dummy/.mvcS"), true);
      assert.strictEqual(
        isNotMvcsDirectory("/very/deeply/nested/project/.mvcs"),
        false,
      );
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

    it("saves a complete timestamped backup of the root files when executed from the project root with a custom message", async function () {
      const mockCp = mock.method(fsPromises, "cp", () => {});
      const mockWriteFile = mock.method(fsPromises, "writeFile", () => {});
      const mockMkdTemp = mock.method(
        fsPromises,
        "mkdtemp",
        (tempPath: string) => tempPath,
      );

      const timestamp = now.getTime().toString();
      const newSnapshotDirPath = path.join(snapshotDirPath, timestamp);
      const customMessage = "My first snap test";

      await snap(customMessage);

      assert.strictEqual(mockMkdTemp.mock.callCount(), 1);
      const [tempFullPath] = mockMkdTemp.mock.calls.at(0)!.arguments;
      const tempPathComponents = path.parse(tempFullPath!);
      assert.strictEqual(tempPathComponents.dir, tempDirectory);
      assert.strictEqual(
        tempPathComponents.base.startsWith(timestamp + "_"),
        true,
      );

      assert.strictEqual(mockCp.mock.callCount(), 2);
      const [tempDirCpCall, snapshotDirCall] = mockCp.mock.calls;

      const [projectSource, tempDestination, tempCpOptions] =
        tempDirCpCall!.arguments;
      assert.strictEqual(projectSource, workingDirectory);
      assert.strictEqual(tempDestination, tempFullPath);
      assert.ok(tempCpOptions?.recursive);
      assert.strictEqual(
        tempCpOptions?.filter?.("/dummy", "destination"),
        true,
      );
      assert.strictEqual(
        tempCpOptions?.filter?.("/.mvcs", "destination"),
        false,
      );

      const [tempSource, snapshotDestination, snapshotCpOptions] =
        snapshotDirCall!.arguments;
      assert.strictEqual(tempSource, tempFullPath);
      assert.strictEqual(snapshotDestination, newSnapshotDirPath);
      assert.deepStrictEqual(snapshotCpOptions, { recursive: true });

      assert.strictEqual(mockWriteFile.mock.callCount(), 1);
      const [filePath, message] = mockWriteFile.mock.calls.at(0)!.arguments;
      const filePathComponents = path.parse(filePath as string);
      const customMessageFileName = "snap_message.txt";
      assert.strictEqual(filePathComponents.dir, newSnapshotDirPath);
      assert.strictEqual(filePathComponents.base, customMessageFileName);
      assert.strictEqual(message, customMessage);
    });

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
