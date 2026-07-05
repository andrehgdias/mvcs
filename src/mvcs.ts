import path from "node:path";
import fsPromises from "node:fs/promises";

export const MVCS_REPOSITORY_NAME = ".mvcs";
export const SNAPSHOTS_REPOSITORY_NAME = "snapshots";

/**
 * Initialize the mvcs repository in the current working directory
 * @param fs File System node module
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
 * Create a snapshot of the current working directory
 * @param fs File System node module
 * @param message Custom informative message about this snapshot
 */
export async function snap(message: string) {
  // TODO Improvement: save only modified, new and removed
  // * FEATURE: save full copy ignoring .mvcs
  // create a snapshot folder with timestamp
  const timestamp = Date.now().toString();
  const newSnapshotDir = path.join(
    process.cwd(),
    MVCS_REPOSITORY_NAME,
    SNAPSHOTS_REPOSITORY_NAME,
    timestamp,
  );
  await fsPromises.mkdir(newSnapshotDir);
  // copy them and the structure to .mvcs/snapshots/timestamp
  // write a txt file with the custom message
}
