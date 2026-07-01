import path from "node:path";

export const MVCS_REPOSITORY_NAME = ".mvcs";
export const SNAPSHOTS_REPOSITORY_NAME = "snapshots";

/**
 * Simple FileSystem module wrapper to use depency injection and  simplify testing
 */
export interface FsWrapper {
  mkdir: (path: string) => Promise<void>;
  cpdir: (source: string, destination: string) => Promise<void>;
}

/**
 * Initialize the mvcs repository in the current working directory
 * @param fs File System node module
 */
export async function init(fs: FsWrapper) {
  const mvcsDirPath = path.join(process.cwd(), MVCS_REPOSITORY_NAME);
  console.log(`Creating MVCS repository at ${mvcsDirPath}`);

  try {
    await fs.mkdir(mvcsDirPath);
  } catch (e) {
    throw new Error("Repository already initialized");
  }

  const snapshotsDirPath = path.join(mvcsDirPath, SNAPSHOTS_REPOSITORY_NAME);
  console.log(`Creating Snapshots repository at ${snapshotsDirPath}`);
  await fs.mkdir(snapshotsDirPath);
}

/**
 * Create a snapshot of the current working directory
 * @param fs File System node module
 * @param message Custom informative message about this snapshot
 */
export async function snap(fs: FsWrapper, message: string) {
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
  await fs.mkdir(newSnapshotDir);
  // copy them and the structure to .mvcs/snapshots/timestamp
  // write a txt file with the custom message
}
