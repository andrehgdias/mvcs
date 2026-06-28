import path from "node:path";

export const MVCS_REPOSITORY_NAME = ".mvcs";
export const SNAPSHOTS_REPOSITORY_NAME = "snapshots";

export type FsWrapper = {
  mkdir: (path: string) => Promise<void>;
};

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
