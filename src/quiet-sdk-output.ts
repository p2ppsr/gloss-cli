type ConsoleMethod = "log" | "warn" | "error";

const quietConsoleMethods: ConsoleMethod[] = ["log", "warn", "error"];

/**
 * Keep dependency-internal diagnostics out of normal CLI output.
 *
 * The SDK can log individual overlay-host failures while it is still
 * reconciling the write. The operation's final result is authoritative: the
 * command prints success after this helper resolves, or a concise error after
 * it rejects.
 */
export async function withQuietSdkOutput<T>(operation: () => Promise<T>): Promise<T> {
  const originalMethods = new Map<ConsoleMethod, typeof console.log>();

  for (const method of quietConsoleMethods) {
    originalMethods.set(method, console[method]);
    console[method] = () => {};
  }

  try {
    return await operation();
  } finally {
    for (const method of quietConsoleMethods) {
      console[method] = originalMethods.get(method)!;
    }
  }
}
