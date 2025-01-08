import React from 'react';
import { render, screen } from '@testing-library/react';
import { Panel } from '../Panel';
import { ChakraProvider } from '@chakra-ui/react';

describe('Panel', () => {
  const renderPanel = (title: string, children: React.ReactNode) => {
    return render(
      <ChakraProvider>
        <Panel title={title}>{children}</Panel>
      </ChakraProvider>
    );
  };

  it('renders the title correctly', () => {
    renderPanel('Test Panel', <div>Content</div>);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderPanel('Test Panel', <div>Test Content</div>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('includes a drag handle', () => {
    const { container } = renderPanel('Test Panel', <div>Content</div>);
    const dragHandle = container.querySelector('.dragHandle');
    expect(dragHandle).toBeInTheDocument();
  });

  it('applies correct accessibility attributes', () => {
    renderPanel('Test Panel', <div>Content</div>);
    const heading = screen.getByText('Test Panel');
    expect(heading.tagName.toLowerCase()).toBe('h2'); // Chakra UI Heading uses h2 for size="sm"
  });
});
