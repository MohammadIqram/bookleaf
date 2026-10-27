import logger from '../utils/logger.js';

export class CircuitBreaker {
  constructor(failureThreshold = 3, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.consecutiveFailures = 0;
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.lastFailureTime = null;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - (this.lastFailureTime || 0);
      if (elapsed > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('[CircuitBreaker] Timeout expired: transitioning to HALF_OPEN to test health');
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    if (this.state !== 'CLOSED') {
      logger.info('[CircuitBreaker] Successful call: transitioning to CLOSED');
    }
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(error) {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    logger.warn(`[CircuitBreaker] Failure recorded (${this.consecutiveFailures}/${this.failureThreshold}): ${error?.message}`);

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error(`[CircuitBreaker] Failure threshold exceeded. Circuit OPEN for ${this.resetTimeoutMs / 1000}s`);
    }
  }

  reset() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
}

export const aiCircuitBreaker = new CircuitBreaker();
export default aiCircuitBreaker;
