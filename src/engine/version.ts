/**
 * Diagnostic Session Engine — versioning.
 *
 * Every DiagnosticSession is stamped at creation with the schema shape it
 * was built against, the engine build that created it, and the app version
 * at the time. This lets loadSession() safely refuse a session written by
 * a schema this build doesn't understand, instead of silently operating on
 * a shape it was never designed for.
 *
 * There is no migration logic here — that is a deliberately separate,
 * future concern. This module only ever answers one question: "is this
 * exact schema version one I know how to handle?"
 */

/** Bump only when the DiagnosticSession shape changes in a breaking way. */
export const SESSION_SCHEMA_VERSION = 1;

/** Bump when the Session Engine's lifecycle/logic changes meaningfully. */
export const SESSION_ENGINE_VERSION = "1.0.0";

/** Mirrors package.json's version at the time a session is created. */
export const APP_VERSION = "0.1.0";

/**
 * This build only ever supports the exact schema version it was written
 * against — no forward or backward compatibility is assumed. A session
 * from any other schema version is unsupported and must be refused, not
 * guessed at.
 */
export function isSupportedSchemaVersion(version: number): boolean {
  return version === SESSION_SCHEMA_VERSION;
}

/** Thrown by loadSession() when a stored session's schema isn't supported. */
export class UnsupportedSchemaVersionError extends Error {
  constructor(
    public readonly sessionId: string,
    public readonly foundSchemaVersion: number,
  ) {
    super(
      `Session "${sessionId}" was created with schema version ` +
        `${foundSchemaVersion}, which this build does not support ` +
        `(supported: ${SESSION_SCHEMA_VERSION}). Refusing to load it.`,
    );
    this.name = "UnsupportedSchemaVersionError";
  }
}
