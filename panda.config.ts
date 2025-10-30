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
