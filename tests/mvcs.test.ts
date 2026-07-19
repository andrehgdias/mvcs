import assert from "assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  isNotMvcsDirectory,
  init,
  MVCS_REPOSITORY_NAME,
  snap,
  SNAPSHOTS_REPOSITORY_NAME,
  MESSAGE_FILE_NAME,
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
    it("filters out the .mvcs directory and all nested files or sub-directories within it", function () {
      // True paths (Should be copied)
      assert.strictEqual(isNotMvcsDirectory("/dummy/.mvcS"), true); // Case sensitive check passes
      assert.strictEqual(
        isNotMvcsDirectory("/very/deeply/nested/project/src/index.ts"),
        true,
      );

      // False paths (Should NOT be copied)
      assert.strictEqual(
        isNotMvcsDirectory("/very/deeply/nested/project/.mvcs"),
        false,
      );
      assert.strictEqual(isNotMvcsDirectory("/dummy/.mvcs/snapshots"), false);
      assert.strictEqual(
        isNotMvcsDirectory("/dummy/.mvcs/snapshots/foo/bar.txt"),
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
    const timestamp = now.getTime().toString();
    const newSnapshotDirPath = path.join(snapshotDirPath, timestamp);

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

      const customMessage = "My first snap test";

      await snap(customMessage);

      assertValidSnapshotCreated({
        mockCp,
        mockMkdTemp,
        mockWriteFile,
        workingDirectory,
        expectedTimestamp: timestamp,
        expectedNewSnapshotDirPath: newSnapshotDirPath,
        customMessage,
      });
    });

    it("correctly resolves and copies from the repository root when executed inside a nested subdirectory", async function () {
      const workingDirectory = path.join(
        "user",
        "projects",
        "personal-project",
        "nested-directory",
      );
      mock.method(process, "cwd", () => workingDirectory); // Monkey patching cwd

      const mockCp = mock.method(fsPromises, "cp", () => {});
      const mockWriteFile = mock.method(fsPromises, "writeFile", () => {});
      const mockMkdTemp = mock.method(
        fsPromises,
        "mkdtemp",
        (tempPath: string) => tempPath,
      );

      const customMessage = "My first snap test";

      await snap(customMessage);

      assertValidSnapshotCreated({
        mockCp,
        mockMkdTemp,
        mockWriteFile,
        workingDirectory,
        expectedTimestamp: timestamp,
        expectedNewSnapshotDirPath: newSnapshotDirPath,
        customMessage,
      });
    });

    it.todo(
      "rejects with a 'Not a MVCS repository' error when executed outside of an initialized .mvcs project",
      async function () {
        // ...
      },
    );
  });

  function assertValidSnapshotCreated({
    mockMkdTemp,
    mockCp,
    mockWriteFile,
    workingDirectory,
    expectedTimestamp,
    expectedNewSnapshotDirPath,
    customMessage,
  }: ValidSnapshotAssertionArgs) {
    // Verify temp snapshot dir was created
    assert.strictEqual(mockMkdTemp.mock.callCount(), 1);
    const [tempFullPath] = mockMkdTemp.mock.calls.at(0)!.arguments;
    const tempPathComponents = path.parse(tempFullPath!);
    assert.strictEqual(tempPathComponents.dir, tempDirectory);
    assert.strictEqual(
      tempPathComponents.base.startsWith(expectedTimestamp + "_"),
      true,
    );

    // Verify cp steps
    assert.strictEqual(mockCp.mock.callCount(), 2);
    const [tempDirCpCall, snapshotDirCall] = mockCp.mock.calls;

    // Verify project was copied to temp dir
    const [projectSource, tempDestination, tempCpOptions] =
      tempDirCpCall!.arguments;
    assert.strictEqual(projectSource, workingDirectory);
    assert.strictEqual(tempDestination, tempFullPath);
    assert.ok(tempCpOptions?.recursive);

    // Verify copying ignored .mvcs directories
    assert.strictEqual(tempCpOptions?.filter?.("/dummy", "destination"), true);
    assert.strictEqual(tempCpOptions?.filter?.("/.mvcs", "destination"), false);

    // Verify proj at temp dir is copied to .mvcs snapshots dir
    const [tempSource, snapshotDestination, snapshotCpOptions] =
      snapshotDirCall!.arguments;
    assert.strictEqual(tempSource, tempFullPath);
    assert.strictEqual(snapshotDestination, expectedNewSnapshotDirPath);
    assert.deepStrictEqual(snapshotCpOptions, { recursive: true });

    // Verify custom message is writen to its file
    assert.strictEqual(mockWriteFile.mock.callCount(), 1);
    const [filePath, message] = mockWriteFile.mock.calls.at(0)!.arguments;
    const filePathComponents = path.parse(filePath.toString());
    assert.strictEqual(filePathComponents.dir, expectedNewSnapshotDirPath);
    assert.strictEqual(filePathComponents.base, MESSAGE_FILE_NAME);
    assert.strictEqual(message, customMessage);
  }
});

type ValidSnapshotAssertionArgs = {
  mockMkdTemp: any;
  mockCp: any;
  mockWriteFile: any;
  workingDirectory: string;
  expectedTimestamp: string;
  expectedNewSnapshotDirPath: string;
  customMessage: string;
};
