export const getDateTimeString = (date: Date) => {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getTimeRemaining = (target: Date) => {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    days,
    hours,
    minutes,
  };
};

export const formatCountdownString = (
  days: number,
  hours: number,
  minutes: number,
) => {
  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} and ${hours} hour${
      hours > 1 ? "s" : ""
    }`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} and ${minutes} minute${
      minutes > 1 ? "s" : ""
    }`;
  } else {
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
};

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
