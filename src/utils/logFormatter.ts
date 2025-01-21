interface StyledText {
  text: string;
  style: {
    color?: string;
    fontWeight?: string;
    fontStyle?: string;
  };
}

export function parseANSIString(input: string): StyledText[] {
  const result: StyledText[] = [];
  let currentText = '';
  let currentStyle: StyledText['style'] = {};

  // ANSI color code mapping to CSS colors
  const colorMap: { [key: string]: string } = {
    '30': '#000000', // Black
    '31': '#E54D4D', // Red
    '32': '#4DAE4D', // Green
    '33': '#FFB700', // Yellow
    '34': '#2472C8', // Blue
    '35': '#BC3FBC', // Magenta
    '36': '#29B6B6', // Cyan
    '37': '#E5E5E5', // White
    '90': '#666666', // Bright Black
    '91': '#FF3334', // Bright Red
    '92': '#9EC400', // Bright Green
    '93': '#E7C547', // Bright Yellow
    '94': '#7AA6DA', // Bright Blue
    '95': '#B77EE0', // Bright Magenta
    '96': '#54CED6', // Bright Cyan
    '97': '#FFFFFF', // Bright White
  };

  // Split the string into parts based on ANSI escape sequences
  const parts = input.split(/(\x1b\[[0-9;]*m)/);

  for (const part of parts) {
    if (part.startsWith('\x1b[')) {
      // This is an ANSI escape sequence
      const codes = part.slice(2, -1).split(';');

      for (const code of codes) {
        switch (code) {
          case '0': // Reset
            currentStyle = {};
            break;
          case '1': // Bold
            currentStyle.fontWeight = 'bold';
            break;
          case '2': // Dim
            currentStyle.fontWeight = '300';
            break;
          case '22': // Normal weight
            delete currentStyle.fontWeight;
            break;
          case '3': // Italic
            currentStyle.fontStyle = 'italic';
            break;
          default:
            // Handle colors
            if (colorMap[code]) {
              currentStyle.color = colorMap[code];
            }
        }
      }
    } else if (part) {
      // This is actual text
      if (currentText) {
        result.push({ text: currentText, style: { ...currentStyle } });
        currentText = '';
      }
      currentText = part;
      if (currentText) {
        result.push({ text: currentText, style: { ...currentStyle } });
        currentText = '';
      }
    }
  }

  return result;
}

export function parseTimestamp(message: string): { timestamp: string; remainingMessage: string } {
  const timestampRegex = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;
  const match = message.match(timestampRegex);

  if (match) {
    return {
      timestamp: match[1],
      remainingMessage: message.slice(match[0].length),
    };
  }

  return {
    timestamp: '',
    remainingMessage: message,
  };
}

export function parseLogLevel(message: string): 'info' | 'error' | 'success' | 'warning' {
  if (message.includes('\x1b[31m')) return 'error'; // Red
  if (message.includes('\x1b[32m')) return 'success'; // Green
  if (message.includes('\x1b[33m')) return 'warning'; // Yellow
  if (message.includes('\x1b[36m')) return 'info'; // Cyan
  return 'info';
}
