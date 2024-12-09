import dailyTotal from "../models/dailyTotal";

export const addtoLimit = async (
  userId: string,
  amount: number,
  type: string
) => {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const total = await dailyTotal.findOneAndUpdate(
    { user: userId, date: { $gte: start, $lt: end } },
    {
      $inc: { [type]: amount },
    },
    { upsert: true, new: true }
  );

  return total;
};

export const getDailyTotal = async (userId: string) => {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const total = await dailyTotal.findOne({
    user: userId,
    date: { $gte: start, $lt: end },
  });

  return total;
};
