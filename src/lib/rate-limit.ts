/**
 * Simple rate limiter queue for API requests
 * Prevents hitting rate limits by spacing out requests
 */

class RateLimitQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private delayMs = 2000; // 2 seconds between requests

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        try {
          await fn();
        } catch (err) {
          console.error("Queue processing error:", err);
        }
        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }

    this.isProcessing = false;
  }

  setDelay(ms: number) {
    this.delayMs = ms;
  }
}

export const rateLimitQueue = new RateLimitQueue();
