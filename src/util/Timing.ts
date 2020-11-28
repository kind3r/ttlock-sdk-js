'use strict';

/**
 * Sleep for
 * @param ms miliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  });
}