import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'gray.900',
      },
      '.react-grid-layout': {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      },
      '.react-grid-item': {
        bg: 'transparent',
      },
    }),
  },
  components: {
    Panel: {
      baseStyle: (props: any) => ({
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
      }),
    },
    Box: {
      variants: {
        panel: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
        }),
      },
    },
    Button: {
      variants: {
        solid: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'blue.500' : 'blue.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'blue.600' : 'blue.600',
          },
        }),
      },
    },
    Table: {
      variants: {
        simple: (props: any) => ({
          th: {
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
            color: props.colorMode === 'dark' ? 'gray.200' : 'gray.700',
          },
          td: {
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
          },
        }),
      },
    },
    Input: {
      variants: {
        outline: (props: any) => ({
          field: {
            bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.300',
            },
            _focus: {
              borderColor: 'blue.500',
              boxShadow: `0 0 0 1px ${props.colorMode === 'dark' ? '#3182ce' : '#3182ce'}`,
            },
          },
        }),
      },
    },
    Textarea: {
      variants: {
        outline: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
          _hover: {
            borderColor: props.colorMode === 'dark' ? 'gray.500' : 'gray.300',
          },
          _focus: {
            borderColor: 'blue.500',
            boxShadow: `0 0 0 1px ${props.colorMode === 'dark' ? '#3182ce' : '#3182ce'}`,
          },
        }),
      },
    },
    Modal: {
      baseStyle: (props: any) => ({
        dialog: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        },
      }),
    },
  },
});

export { theme };
