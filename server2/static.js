import { serve } from "bun";

serve({
  port: 3001,
  fetch(request) {
    return new Response("Hello World!");
  },
});

console.log("Bun static server running on http://localhost:3001");
