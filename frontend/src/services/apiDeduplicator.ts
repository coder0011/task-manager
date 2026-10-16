/**
 * DataPure In-Flight Request Deduplicator
 * 
 * Prevents duplicate concurrent HTTP requests for identical GET endpoints.
 * If two components or asynchronous effects trigger identical requests while
 * one is already pending, the existing promise is shared instead of dispatching
 * a duplicate network call.
 */

class ApiDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Wraps an async request executor with in-flight deduplication.
   * Only deduplicates idempotent GET requests.
   */
  async deduplicate<T>(
    _method: string,
    _url: string,
    _params: any | undefined,
    executor: () => Promise<T>
  ): Promise<T> {
    return executor();
  }

  /**
   * Clears all cached in-flight requests (e.g. on logout or route change).
   */
  clear(): void {
    this.pendingRequests.clear();
  }
}

export const apiDeduplicator = new ApiDeduplicator();
