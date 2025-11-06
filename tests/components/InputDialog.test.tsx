/**
 * Component tests for InputDialog
 */

import { render } from 'ink-testing-library';
import { InputDialog } from '../../src/components/dialogs/InputDialog.js';

describe('InputDialog Component', () => {
  it('should render with title and label', () => {
    const onSubmit = (): void => {};
    const onCancel = (): void => {};

    const { lastFrame } = render(
      <InputDialog
        title="Test Title"
        label="Enter value:"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Test Title');
    expect(output).toContain('Enter value:');
  });

  it('should render with helper text', () => {
    const onSubmit = (): void => {};
    const onCancel = (): void => {};

    const { lastFrame } = render(
      <InputDialog
        title="Test Title"
        label="Enter value:"
        helperText="This is helper text"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('This is helper text');
  });

  it('should render with default value', () => {
    const onSubmit = (): void => {};
    const onCancel = (): void => {};

    const { lastFrame } = render(
      <InputDialog
        title="Test Title"
        label="Enter value:"
        defaultValue="Initial value"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Initial value');
  });

  it('should show help text for keyboard shortcuts', () => {
    const onSubmit = (): void => {};
    const onCancel = (): void => {};

    const { lastFrame } = render(
      <InputDialog
        title="Test Title"
        label="Enter value:"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    const output = lastFrame();
    expect(output).toContain('Enter');
    expect(output).toContain('Esc');
  });

  it('should render with double border', () => {
    const onSubmit = (): void => {};
    const onCancel = (): void => {};

    const { lastFrame } = render(
      <InputDialog
        title="Test Title"
        label="Enter value:"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    const output = lastFrame();
    // Double border characters
    expect(output).toMatch(/[╔╗╚╝═║]/);
  });
});
