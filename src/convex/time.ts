export const getESTDate = () => {
  const now = new Date();
  const estNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return estNow;
};

export const getMonthBounds = () => {
  const estNow = getESTDate();
  const startEST = new Date(
    estNow.getFullYear(),
    estNow.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const endEST = new Date(
    estNow.getFullYear(),
    estNow.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  const start = convertToUTC(startEST);
  const end = convertToUTC(endEST);
  return { start, end };
};

export const getDayBounds = () => {
  const estNow = getESTDate();
  const startEST = new Date(
    estNow.getFullYear(),
    estNow.getMonth(),
    estNow.getDate(),
    0,
    0,
    0,
    0,
  );
  const endEST = new Date(
    estNow.getFullYear(),
    estNow.getMonth(),
    estNow.getDate(),
    23,
    59,
    59,
    999,
  );
  const start = convertToUTC(startEST);
  const end = convertToUTC(endEST);
  return { start, end };
};

export const convertToUTC = (date: Date) => {
  const now = new Date();
  const estNow = getESTDate();
  const offset = now.getTime() - estNow.getTime();
  return new Date(date.getTime() + offset);
};
