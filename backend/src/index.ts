import app from "./app";

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "vercel") {
  app
    .listen(PORT, () => {
      console.log(`OpenBand API running on port ${PORT}`);
    })
    .on("error", (err: Error) => {
      console.error(`Failed to start server on port ${PORT}:`, err.message);
      process.exit(1);
    });
}

export default app;
