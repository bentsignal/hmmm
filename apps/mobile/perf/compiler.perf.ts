// Every component and hook in src/ must compile with the React Compiler.
// When it can't compile one (syntax it doesn't support yet, a value it
// thinks is mutated), it leaves that function as is, silently: nothing
// memoized, every object and callback new on each render. One such hook
// (`useMenuKeyboard`) made every message on screen re-render on every
// update. The lint rule runs an older compiler that misses these, so this
// compiles each file with the app's own (as `babel-preset-expo` runs it).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { transformSync } from "@babel/core";

const SRC = path.join(__dirname, "../src");

/** The app's components, hooks, and modules: not tests or declarations. */
function sourceFiles() {
  return readdirSync(SRC, { encoding: "utf8", recursive: true })
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|d)\.ts$/.test(file))
    .map((file) => path.join(SRC, file));
}

interface CompilerEvent {
  kind: string;
  fnLoc?: { start: { line: number } } | null;
  detail?: { options?: { reason?: string; description?: string } };
}

/** Where the compiler gave up on a function in `file`, and why. */
function skipped(file: string) {
  const events = new Array<CompilerEvent>();
  transformSync(readFileSync(file, "utf8"), {
    babelrc: false,
    configFile: false,
    filename: file,
    parserOpts: { plugins: ["typescript", "jsx"] },
    plugins: [
      [
        "babel-plugin-react-compiler",
        {
          logger: {
            logEvent: (_: string, event: CompilerEvent) => events.push(event),
          },
          target: "19",
        },
      ],
    ],
  });
  return events
    .filter((event) => event.kind === "CompileError")
    .map((event) => {
      const where = `${path.relative(SRC, file)}:${event.fnLoc?.start.line ?? "?"}`;
      const { reason = "", description = "" } = event.detail?.options ?? {};
      return `${where} ${reason} ${description}`.trim();
    });
}

test("the React Compiler compiles every component and hook", () => {
  expect(sourceFiles().flatMap(skipped)).toEqual([]);
});
