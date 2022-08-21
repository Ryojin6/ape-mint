const colors = require("tailwindcss/colors");

module.exports = {
  mode: "jit",
  content: ["./src/**/*.tsx", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        ape: {
          pink: "#be3d55",
        },

        // General
        page: {
          from_bg: colors.slate[100],
          to_bg: colors.slate[300],
        },
        titles: colors.violet[900],
        links: {
          txt: colors.violet[600],
          hover_txt: colors.violet[700],
        },
        loading_spinner: colors.violet[500],
        popups: {
          bg: colors.white,
          txt: colors.slate[800],
          internal_border: colors.slate[200],
        },
        warning: {
          txt: colors.slate[800],
          bg: colors.yellow[400],
          border: colors.yellow[500],
        },
        error: {
          txt: colors.red[500],
          bg: colors.red[50],
          border: colors.red[200],
        },

        // Inputs
        btn: {
          txt: colors.slate[800],
          bg: colors.white,
          border: colors.slate[200],
          hover_txt: colors.slate[800],
          hover_bg: colors.slate[100],
          hover_border: colors.slate[200],
        },
        btn_primary: {
          txt: colors.white,
          bg: colors.violet[500],
          border: colors.violet[500],
          hover_txt: colors.white,
          hover_bg: colors.violet[600],
          hover_border: colors.violet[600],
        },
        btn_error: {
          txt: colors.white,
          bg: colors.red[500],
          border: colors.red[500],
          hover_txt: colors.white,
          hover_bg: colors.red[600],
          hover_border: colors.red[600],
        },
        label: colors.violet[600],
        txt_input: {
          txt: colors.violet[600],
          bg: colors.white,
          border: colors.slate[200],
          focus_txt: colors.violet[600],
          focus_bg: colors.slate[50],
          focus_border: colors.violet[300],
          placeholder_txt: colors.violet[600],
        },

        // Whitelist proof widget
        wl_message: {
          txt: colors.slate[800],
          bg: colors.violet[100],
        },

        // Mint widget
        token_preview: colors.violet[200],
      },
    },
  },
  variants: {},
  plugins: [],
};
