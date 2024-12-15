import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.900',
      },
      '.react-grid-layout': {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
      },
      '.react-grid-item': {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
      },
    }),
  },
  components: {
    Box: {
      baseStyle: (props: any) => ({
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
      }),
    },
  },
});

export { theme }; 