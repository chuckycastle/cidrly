/**
 * Component tests for ConfirmDialog
 */

import { render } from 'ink-testing-library';
import { ConfirmDialog } from '../../src/components/dialogs/ConfirmDialog.js';

describe('ConfirmDialog Component', () => {
  it('should render with title and message', () => {
    const onConfirm = (): void => {};

    const { lastFrame } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    const output = lastFrame();
    expect(output).toContain('Confirm Action');
    expect(output).toContain('Are you sure?');
  });

  it('should render with multiline message', () => {
    const onConfirm = (): void => {};

    const { lastFrame } = render(
      <ConfirmDialog
        title="Confirm Action"
        message="Line 1\nLine 2\nLine 3"
        onConfirm={onConfirm}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Line 1');
    expect(output).toContain('Line 2');
    expect(output).toContain('Line 3');
  });

  it('should render Yes and No buttons', () => {
    const onConfirm = (): void => {};

    const { lastFrame } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    const output = lastFrame();
    expect(output).toContain('Yes');
    expect(output).toContain('No');
  });

  it('should default focus to No button', () => {
    const onConfirm = (): void => {};

    const { lastFrame } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    const output = lastFrame();
    // No button should be focused by default (visible with selection indicator)
    expect(output).toMatch(/▸.*No/); // Check for selection symbol before No
  });

  it('should show help text for keyboard shortcuts', () => {
    const onConfirm = (): void => {};

    const { lastFrame } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    const output = lastFrame();
    expect(output).toContain('y/n');
    expect(output).toContain('Enter');
  });

  it('should render with double border', () => {
    const onConfirm = (): void => {};

    const { lastFrame } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    const output = lastFrame();
    // Double border characters
    expect(output).toMatch(/[╔╗╚╝═║]/);
  });

  it('should call onConfirm(true) when y is pressed', () => {
    let called = false;
    let result: boolean | undefined;
    const onConfirm = (value: boolean): void => {
      called = true;
      result = value;
    };

    const { stdin } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    stdin.write('y');
    expect(called).toBe(true);
    expect(result).toBe(true);
  });

  it('should call onConfirm(false) when n is pressed', () => {
    let called = false;
    let result: boolean | undefined;
    const onConfirm = (value: boolean): void => {
      called = true;
      result = value;
    };

    const { stdin } = render(
      <ConfirmDialog title="Confirm Action" message="Are you sure?" onConfirm={onConfirm} />,
    );

    stdin.write('n');
    expect(called).toBe(true);
    expect(result).toBe(false);
  });
});
