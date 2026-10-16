import { defineConfig } from "@pandacss/dev";
import { createPreset } from "@park-ui/panda-preset";
import blue from "@park-ui/panda-preset/colors/blue";
import neutral from "@park-ui/panda-preset/colors/neutral";
import red from "@park-ui/panda-preset/colors/red";
import green from "@park-ui/panda-preset/colors/green";
import yellow from "@park-ui/panda-preset/colors/yellow";
import orange from "@park-ui/panda-preset/colors/orange";
import purple from "@park-ui/panda-preset/colors/purple";
import pink from "@park-ui/panda-preset/colors/pink";
import teal from "@park-ui/panda-preset/colors/teal";
import cyan from "@park-ui/panda-preset/colors/cyan";

export default defineConfig({
  preflight: true,
  presets: [
    "@pandacss/preset-base",
    createPreset({
      accentColor: blue,
      grayColor: neutral,
      radius: "md"
    })
  ],

  include: ["./src/**/*.{js,jsx,ts,tsx}"],
  exclude: ["./.reference-eventernote-tools/**/*"],

  theme: {
    extend: {
      slotRecipes: {
        card: {
          base: {
            root: { boxShadow: "none", borderWidth: "1px", borderColor: "border.subtle" },
            header: { p: { base: "4", md: "6" } },
            body: { px: { base: "4", md: "6" }, pb: { base: "4", md: "6" } },
            footer: { px: { base: "4", md: "6" }, pb: { base: "4", md: "6" } }
          }
        }
      },
      recipes: {
        button: {
          variants: {
            size: {
              xs: { h: { base: "11", md: "8" }, minW: { base: "11", md: "8" } },
              sm: { h: { base: "11", md: "9" }, minW: { base: "11", md: "9" } },
              md: { h: { base: "11", md: "10" }, minW: { base: "11", md: "10" } }
            }
          }
        }
      },
      tokens: {
        colors: {
          red: {
            ...red.tokens
          },
          green: {
            ...green.tokens
          },
          yellow: {
            ...yellow.tokens
          },
          orange: {
            ...orange.tokens
          },
          purple: {
            ...purple.tokens
          },
          pink: {
            ...pink.tokens
          },
          teal: {
            ...teal.tokens
          },
          cyan: {
            ...cyan.tokens
          }
        }
      },
      semanticTokens: {
        colors: {
          blue: {
            default: { value: { _light: "{colors.blue.light.11}", _dark: "{colors.blue.dark.8}" } },
            emphasized: { value: { _light: "{colors.blue.light.12}", _dark: "{colors.blue.dark.7}" } }
          },
          fg: {
            subtle: { value: { _light: "#6f6f6f", _dark: "#949494" } },
            error: { value: { _light: "{colors.red.light.11}", _dark: "{colors.red.dark.11}" } }
          },
          border: {
            control: { value: { base: "{colors.gray.light.9}", _dark: "{colors.gray.dark.10}" } }
          },
          red: {
            ...red.semanticTokens
          },
          green: {
            ...green.semanticTokens
          },
          yellow: {
            ...yellow.semanticTokens
          },
          orange: {
            ...orange.semanticTokens
          },
          purple: {
            ...purple.semanticTokens
          },
          pink: {
            ...pink.semanticTokens
          },
          teal: {
            ...teal.semanticTokens
          },
          cyan: {
            ...cyan.semanticTokens
          }
        }
      }
    }
  },

  jsxFramework: "react",

  outdir: "./styled-system",

  importMap: {
    css: "styled-system/css",
    recipes: "styled-system/recipes",
    patterns: "styled-system/patterns",
    jsx: "styled-system/jsx"
  },

  conditions: {
    extend: {
      dark: ["&.dark, .dark &"],
      light: ["&.light, .light &"]
    }
  },

  globalCss: {
    html: {
      scrollSnapType: "y proximity",
      height: "100%"
    },
    body: {
      margin: 0,
      fontFamily: "body",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      bg: "bg.canvas",
      color: "fg.default",
      height: "100%"
    },
    "*": {
      boxSizing: "border-box",
      transitionProperty: "background-color, border-color, color, fill, stroke",
      transitionDuration: "200ms",
      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
    },
    "*:focus-visible": {
      outline: "2px solid {colors.accent.default}",
      outlineOffset: "2px"
    }
  },

  lightningcss: true,
  minify: process.env.NODE_ENV === "production",
  hash:
    process.env.NODE_ENV === "production"
      ? {
          className: true,
          cssVar: true
        }
      : false
});
