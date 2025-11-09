/**
 * Debounce Utility Tests
 */

import { jest } from '@jest/globals';
import { debounce, debouncedWithFlush } from '../../src/utils/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = jest.fn();
    const debounced = debounce(mockFn, 500);

    debounced('test');
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls when invoked multiple times', () => {
    const mockFn = jest.fn();
    const debounced = debounce(mockFn, 500);

    debounced('first');
    jest.advanceTimersByTime(200);

    debounced('second');
    jest.advanceTimersByTime(200);

    debounced('third');
    jest.advanceTimersByTime(500);

    // Only the last call should execute
    expect(mockFn).toHaveBeenCalledWith('third');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should work with multiple arguments', () => {
    const mockFn = jest.fn();
    const debounced = debounce(mockFn, 500);

    debounced('arg1', 'arg2', 'arg3');
    jest.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });
});

describe('debouncedWithFlush', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay function execution like regular debounce', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('test');
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should immediately execute on flush()', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('test');
    expect(mockFn).not.toHaveBeenCalled();

    debounced.flush();
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should not execute after flush() when timer expires', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('test');
    debounced.flush();

    jest.advanceTimersByTime(500);

    // Should only be called once from flush, not again from timer
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel pending execution without running the function', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('test');
    expect(mockFn).not.toHaveBeenCalled();

    debounced.cancel();

    jest.advanceTimersByTime(500);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should handle flush() when no pending calls', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced.flush();
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should handle cancel() when no pending calls', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced.cancel();
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should preserve latest args when flushed', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('first');
    debounced('second');
    debounced('third');

    debounced.flush();

    expect(mockFn).toHaveBeenCalledWith('third');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should allow new calls after cancel()', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('first');
    debounced.cancel();

    debounced('second');
    jest.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledWith('second');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should allow new calls after flush()', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    debounced('first');
    debounced.flush();

    debounced('second');
    jest.advanceTimersByTime(500);

    expect(mockFn).toHaveBeenCalledWith('first');
    expect(mockFn).toHaveBeenCalledWith('second');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle async functions', async () => {
    const mockAsyncFn = jest.fn(async (value: string) => {
      return `processed: ${value}`;
    });
    const debounced = debouncedWithFlush(mockAsyncFn, 500);

    debounced('test');
    jest.advanceTimersByTime(500);

    // Wait for async execution
    await Promise.resolve();

    expect(mockAsyncFn).toHaveBeenCalledWith('test');
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('should prevent memory leaks by canceling pending operations', () => {
    const mockFn = jest.fn();
    const debounced = debouncedWithFlush(mockFn, 500);

    // Simulate rapid changes (like changing saveDelay preference)
    debounced('v1');
    debounced('v2');
    debounced('v3');

    // Cancel to clean up before creating new debounced function
    debounced.cancel();

    jest.advanceTimersByTime(500);

    // Should not execute any of the canceled calls
    expect(mockFn).not.toHaveBeenCalled();
  });
});
