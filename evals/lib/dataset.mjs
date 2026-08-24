import { readFileSync } from "node:fs";

export const DATASET_PATH = "evals/dataset/mg-core.jsonl";

export function loadDataset(path = DATASET_PATH) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`${path}:${i + 1} is not valid JSON — ${e.message}`);
      }
    });
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1] ?? true;
  }
  return args;
}
