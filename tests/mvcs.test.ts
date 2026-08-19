import assert from "assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
  isNotMvcsDirectory,
  init,
  MVCS_REPOSITORY_NAME,
  snap,
  SNAPSHOTS_REPOSITORY_NAME,
  MESSAGE_FILE_NAME,
  findMvcsRoot,
} from "../src/mvcs.js";
import path from "path";

import fsPromises from "node:fs/promises";
import os from "node:os";

describe("mvcs core functions", function () {
  const PROJECT_ROOT = path.join(
    path.sep,
    "user",
    "projects",
    "personal-project",
  );
  const TEMP_DIR = path.join(path.sep, "user", "temp");

  beforeEach(function () {
    mock.method(process, "cwd", () => PROJECT_ROOT); // Monkey patching cwd
    mock.method(os, "tmpdir", () => TEMP_DIR); // Monkey patching tmpdir
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
      assert.strictEqual(mvcsDirPathComponents.dir, PROJECT_ROOT);
      assert.strictEqual(mvcsDirPathComponents.base, MVCS_REPOSITORY_NAME);

      const snapshotDirPath = snapshotDirCall?.arguments.at(0)! as string;
      const snapshotDirPathComponents = path.parse(snapshotDirPath);
      assert.strictEqual(
        snapshotDirPathComponents.dir,
        path.join(PROJECT_ROOT, MVCS_REPOSITORY_NAME),
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

  describe("snap", function () {
    const now = new Date("2026-06-01");
    const snapshotDirPath = path.join(
      PROJECT_ROOT,
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

      mock.method(fsPromises, "readdir", async () => [
        { name: "file.txt", isDirectory: () => false },
        { name: "dir", isDirectory: () => true },
        { name: ".mvcs", isDirectory: () => true },
      ]);

      const customMessage = "My first snap test";

      await snap(customMessage);

      assertValidSnapshotCreated({
        mockCp,
        mockMkdTemp,
        mockWriteFile,
        projectRoot: PROJECT_ROOT,
        expectedTimestamp: timestamp,
        expectedNewSnapshotDirPath: newSnapshotDirPath,
        customMessage,
      });
    });

    it("correctly resolves and copies from the repository root when executed inside a nested subdirectory", async function () {
      const workingDirectory = path.join(PROJECT_ROOT, "nested-directory");
      mock.method(process, "cwd", () => workingDirectory); // Monkey patching cwd

      const mockCp = mock.method(fsPromises, "cp", () => {});
      const mockWriteFile = mock.method(fsPromises, "writeFile", () => {});
      const mockMkdTemp = mock.method(
        fsPromises,
        "mkdtemp",
        (tempPath: string) => tempPath,
      );

      mock.method(fsPromises, "readdir", async (dir: string) => {
        switch (dir) {
          case PROJECT_ROOT:
            return [
              { name: "file.txt", isDirectory: () => false },
              { name: "dir", isDirectory: () => true },
              { name: ".mvcs", isDirectory: () => true },
            ];
          case workingDirectory:
          default:
            return [];
        }
      });

      const customMessage = "My first snap test";

      await snap(customMessage);

      assertValidSnapshotCreated({
        mockCp,
        mockMkdTemp,
        mockWriteFile,
        projectRoot: PROJECT_ROOT,
        expectedTimestamp: timestamp,
        expectedNewSnapshotDirPath: newSnapshotDirPath,
        customMessage,
      });
    });

    it("rejects with a 'Not a MVCS repository' error when executed outside of an initialized .mvcs project", async function () {
      mock.method(fsPromises, "readdir", async (_dir: string) => [
        { name: "imagesDir", isDirectory: () => true },
      ]);

      await assert.rejects(
        snap("Test snap message"),
        `Error: Not a MVCS repository: ${path.join(PROJECT_ROOT, "imagesDir")}`,
      );
    });
  });

  function assertValidSnapshotCreated({
    mockMkdTemp,
    mockCp,
    mockWriteFile,
    projectRoot,
    expectedTimestamp,
    expectedNewSnapshotDirPath,
    customMessage,
  }: ValidSnapshotAssertionArgs) {
    // Verify temp snapshot dir was created
    assert.strictEqual(mockMkdTemp.mock.callCount(), 1);
    const [tempFullPath] = mockMkdTemp.mock.calls.at(0)!.arguments;
    const tempPathComponents = path.parse(tempFullPath!);
    assert.strictEqual(tempPathComponents.dir, TEMP_DIR);
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
    assert.strictEqual(projectSource, projectRoot);
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

describe("helpers", function () {
  describe("isNotMvcsDirectory", function () {
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

  describe("findMvcsRoot", function () {
    it("finds mvcs directory at current location", async function () {
      const currentDirectory = "/my/nested/project";
      const contents = [
        { name: "file.txt", isDirectory: () => false },
        { name: "dir", isDirectory: () => true },
        { name: ".mvcs", isDirectory: () => true },
      ];

      mock.method(fsPromises, "readdir", async () => contents);

      const mvcsPath = await findMvcsRoot(currentDirectory);

      assert.strictEqual(mvcsPath, currentDirectory);
    });

    it("finds mvcs directory three levels above current location", async function () {
      const mvcsDirectoryLocation = "/my/nested/project";
      const currentDirectory = mvcsDirectoryLocation + "/lvl1/lvl2/lvl3";

      mock.method(process, "cwd", () => currentDirectory); // !fix mock cwd for each level
      mock.method(fsPromises, "readdir", async (dir: string) => {
        switch (dir) {
          case mvcsDirectoryLocation:
            return [
              { name: "file.txt", isDirectory: () => false },
              { name: "dir", isDirectory: () => true },
              { name: ".mvcs", isDirectory: () => true },
            ];
          default:
            return [];
        }
      });

      const mvcsPath = await findMvcsRoot(currentDirectory);

      assert.strictEqual(mvcsPath, mvcsDirectoryLocation);
    });

    it("cannot find a mvcs directory on a empty directory", async function () {
      mock.method(fsPromises, "readdir", async () => []);

      const mvcsPath = await findMvcsRoot(
        "/my/nested/unintilialized/empty/project",
      );

      assert.strictEqual(mvcsPath, null);
    });

    it("cannot find a mvcs directory on a populated directory", async function () {
      mock.method(fsPromises, "readdir", async () => [
        { name: "myDir", isDirectory: () => true },
        { name: "cat.png", isDirectory: () => false },
      ]);

      const mvcsPath = await findMvcsRoot(
        "/my/nested/unintilialized/empty/project",
      );

      assert.strictEqual(mvcsPath, null);
    });
  });
});

type ValidSnapshotAssertionArgs = {
  mockMkdTemp: any;
  mockCp: any;
  mockWriteFile: any;
  projectRoot: string;
  expectedTimestamp: string;
  expectedNewSnapshotDirPath: string;
  customMessage: string;
};
