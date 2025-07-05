import { useEffect, useState } from "react";
import { getTimeRemaining } from "../util/date-time-util";

interface UseCountdownProps {
  target: Date;
  updateInterval: number; // in minutes
}

export default function useCountdown({
  target,
  updateInterval,
}: UseCountdownProps) {
  const initialTime = getTimeRemaining(target);
  const [minutes, setMinutes] = useState(initialTime.minutes);
  const [hours, setHours] = useState(initialTime.hours);
  const [days, setDays] = useState(initialTime.days);

  useEffect(() => {
    const updateCountdown = () => {
      const { days, hours, minutes } = getTimeRemaining(target);
      setMinutes(minutes);
      setHours(hours);
      setDays(days);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, updateInterval * 1000 * 60);

    return () => clearInterval(interval);
  }, [target, updateInterval]);

  return {
    minutes,
    hours,
    days,
  };
}
