import assert from "assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
  mock,
  type Mock,
} from "node:test";
import {
  init,
  MVCS_REPOSITORY_NAME,
  snap,
  SNAPSHOTS_REPOSITORY_NAME,
  type FsWrapper,
} from "../src/mvcs.js";
import path from "path";

describe("mvcs core functions", function () {
  let mockMkdir: Mock<FsWrapper["mkdir"]>;
  let mockCpdir: Mock<FsWrapper["cpdir"]>;

  let fs: FsWrapper;

  const workingDirectory = path.join("user", "projects", "personal-project");

  beforeEach(function () {
    mockMkdir = mock.fn(async (_path: string) => {});
    mockCpdir = mock.fn(async (_src: string, _dest: string) => {});

    fs = {
      mkdir: mockMkdir,
      cpdir: mockCpdir,
    };

    mock.method(process, "cwd", () => workingDirectory); // Monkey patching cwd
  });

  afterEach(function () {
    mock.reset();
  });

  describe("init", function () {
    it("creates .mvcs directory under the working directory", async function () {
      await init(fs);

      assert.strictEqual(mockMkdir.mock.callCount(), 2);

      const mvcsCallArgs = mockMkdir.mock.calls.at(0)!.arguments;
      const pathComponents = path.parse(mvcsCallArgs.at(0)!);
      assert.strictEqual(pathComponents.dir, workingDirectory);
      assert.strictEqual(pathComponents.base, MVCS_REPOSITORY_NAME);
    });

    it("creates .mvcs/snapshots directory", async function () {
      await init(fs);

      assert.strictEqual(mockMkdir.mock.callCount(), 2);

      const snapshotsCallArgs = mockMkdir.mock.calls.at(1)!.arguments;
      const pathComponents = path.parse(snapshotsCallArgs.at(0)!);
      assert.strictEqual(
        pathComponents.dir,
        path.join(workingDirectory, MVCS_REPOSITORY_NAME),
      );
      assert.strictEqual(pathComponents.base, SNAPSHOTS_REPOSITORY_NAME);
    });

    it("fails when repository is already initialized - .mvcs alreday exists", async function () {
      mockMkdir = mock.fn((_path: string) => {
        throw new Error("");
      });
      fs = {
        ...fs,
        mkdir: mockMkdir,
      };

      await assert.rejects(async function () {
        await init(fs);
      }, "Error: Repository already initialized");
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

    it("creates a directory with the snapshot timestamp under .mvcs/snapshots", async function () {
      await snap(fs, "Snap message");

      assert.strictEqual(mockMkdir.mock.callCount(), 1);

      const callArgs = mockMkdir.mock.calls.at(0)!.arguments;
      const pathComponents = path.parse(callArgs.at(0)!);

      assert.strictEqual(pathComponents.dir, snapshotDirPath);
      assert.strictEqual(pathComponents.base, now.getTime().toString());
    });

    it.todo(
      "copies all directories and files from root/working directory to .mvcs/snapshots/{timestamp} and keep its structure",
      async function () {
        await snap(fs, "Snap message");

        assert.strictEqual(mockCpdir.mock.callCount(), 1);

        const callArgs = mockCpdir.mock.calls.at(0)!.arguments;

        const srcDir = callArgs.at(0)!;
        assert.strictEqual(srcDir, workingDirectory);

        const destDir = callArgs.at(1)!;
        assert.strictEqual(destDir, snapshotDirPath);

        // how to assert it will keep the structure? should I even test this?
      },
    );

    it.todo(
      "creates a txt file at .mvcs/snapshots/{timestamp} with the custom message",
      async function () {},
    );

    it.todo(
      "creating a snapshot from a subdirectory should copy repository root folder and its contents, excluding .mvcs",
      async function () {},
    );
  });
});
