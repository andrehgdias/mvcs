import path from "node:path";
import fsPromises from "node:fs/promises";
import os from "node:os";

export const MVCS_REPOSITORY_NAME = ".mvcs";
export const SNAPSHOTS_REPOSITORY_NAME = "snapshots";

/**
 * Initialize the mvcs repository in the current working directory
 */
export async function init() {
  const mvcsDirPath = path.join(process.cwd(), MVCS_REPOSITORY_NAME);
  console.log(`Creating MVCS repository at ${mvcsDirPath}`);

  try {
    await fsPromises.mkdir(mvcsDirPath);
  } catch (e: any) {
    if (e.code === "EEXIST") {
      throw new Error("Repository already initialized");
    }

    throw e;
  }

  const snapshotsDirPath = path.join(mvcsDirPath, SNAPSHOTS_REPOSITORY_NAME);
  console.log(`Creating Snapshots repository at ${snapshotsDirPath}`);
  await fsPromises.mkdir(snapshotsDirPath);

  console.log(`MVCS repository initialized. Happy hacking! ;)`);
}

/**
 * Create a snapshot of the current working directory from the root of the mvcs repository
 *
 * @param message Custom informative message about this snapshot
 */
export async function snap(message: string) {
  // TODO Improvement: save only modified, new and removed
  // TODO Improvement: save changes on the relative path instead of the root of the repository
  const timestamp = Date.now().toString();
  const newSnapshotDir = path.join(
    process.cwd(),
    MVCS_REPOSITORY_NAME,
    SNAPSHOTS_REPOSITORY_NAME,
    timestamp,
  );

  const tmpDir = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), timestamp + "_"),
  );

  await fsPromises.cp(process.cwd(), tmpDir, {
    recursive: true,
    filter: isNotMvcsDirectory,
  });

  await fsPromises.cp(tmpDir, newSnapshotDir, {
    recursive: true,
  });

  const messageFileName = "snap_message.txt";
  const messageFilePath = path.join(newSnapshotDir, messageFileName);
  await fsPromises.writeFile(messageFilePath, message);
}

/**
 * Return true ONLY if ".mvcs" is completely absent from the entire path tree
 *
 * @VisibleForTesting
 * */
export function isNotMvcsDirectory(source: string) {
  const pathComponents = source.split(path.sep);
  return !pathComponents.includes(MVCS_REPOSITORY_NAME);
}
