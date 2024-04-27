export const notFound = ({ req, res }: any) =>
  res.status(404).send("Route does not exist");
