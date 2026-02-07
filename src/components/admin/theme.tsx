import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
  
    background: {
      default: "hsl(var(--background))",
      paper: "hsl(var(--background))",
    },

    text: {
      primary: "hsl(var(--foreground))",
    },
    divider: "hsl(var(--background))",
    
    action: {
      hover: "hsl(var(--accent) / 0.1)",
    },
  },
});
