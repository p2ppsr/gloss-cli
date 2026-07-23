import assert from "node:assert/strict";
import test from "node:test";
import { withQuietSdkOutput } from "../dist/quiet-sdk-output.js";

test("suppresses SDK diagnostics when reconciliation succeeds", async () => {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  const output = [];

  console.log = (...args) => output.push(["log", ...args]);
  console.warn = (...args) => output.push(["warn", ...args]);
  console.error = (...args) => output.push(["error", ...args]);

  try {
    const result = await withQuietSdkOutput(async () => {
      console.error(new Error("Failed to facilitate broadcast"));
      console.warn("retrying");
      console.log("reconciling");
      return "written";
    });

    assert.equal(result, "written");
    assert.deepEqual(output, []);
    assert.notEqual(console.log, original.log);
    assert.notEqual(console.warn, original.warn);
    assert.notEqual(console.error, original.error);
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }
});

test("restores CLI output before reporting a final failure", async () => {
  const originalError = console.error;
  const visible = [];
  console.error = (...args) => visible.push(args);
  const cliError = console.error;

  try {
    await assert.rejects(
      withQuietSdkOutput(async () => {
        console.error(new Error("transient host failure"));
        throw new Error("all hosts rejected the write");
      }),
      /all hosts rejected the write/
    );

    assert.equal(console.error, cliError);
    console.error("concise final error");
    assert.deepEqual(visible, [["concise final error"]]);
  } finally {
    console.error = originalError;
  }
});
