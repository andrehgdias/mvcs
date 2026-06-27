import path from "node:path";

export const MVCS_REPOSITORY_NAME = ".mvcs";

export type FsWrapper = {
  mkdir: (path: string) => void;
};

export async function init(fs: FsWrapper) {
  const targetDirPath = path.join(process.cwd(), MVCS_REPOSITORY_NAME);

  console.log(`Creating MVCS repository at ${targetDirPath}`);

  await fs.mkdir(targetDirPath);
}
